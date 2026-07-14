const User = require('../../models/User');
const { enrichProducts, enrichProductsLight } = require('../../utils/productEnrichment');
const {
  VALID_TABS,
  TAB_API_KEYS,
  loadFilterContext,
  countProductsByTab,
  filterProductsForTab,
} = require('../../utils/smartReportFilter');

const TENANT_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// One cache entry per tenant — NOT per tab. The enriched product list is the
// same regardless of which tab the user is looking at, so we scan+enrich the
// whole ept_product_details_new collection exactly once, then every tab's
// products/counts are derived in-memory (simple array filter, zero DB calls).
const tenantCache = new Map();

const BASE_FILTER = {
  status: 'active',
  ean_product_data_details_scrap_status: 'completed',
};

function getOrCreateTenantState(tenantId) {
  if (!tenantCache.has(tenantId)) {
    tenantCache.set(tenantId, {
      products: [],
      scanComplete: false,
      context: null,
      scannedAt: null,
      scanPromise: null, // in-flight scan lock — see getTenantState
    });
  }
  return tenantCache.get(tenantId);
}

// Runs the actual scan from scratch. Only ever called from inside
// getTenantState, and only ever ONE of these runs per tenant at a time
// (protected by state.scanPromise below) — this is what prevents two
// concurrent requests from racing on the same state.products.
//
// FIXED: previously this paginated through the collection in 300-doc
// batches, and enrichProductsLight() re-ran buildCompetitorMap() (which
// re-queries ept_competitor_info + every ept_product_details_new_<slug>
// competitor collection) ONCE PER BATCH. For ~5 batches x ~5 competitors
// that was ~25 serialized round trips instead of ~5 parallel ones — this
// was the actual source of the 25s first-load. buildCompetitorMap already
// parallelizes across competitors regardless of how many products it's
// given, so there's no benefit to chunking — fetch everything once and
// enrich once.
async function runFullScan(db, tenantId, state) {
  state.products = [];
  state.scanComplete = false;
  state.context = null;

  const [context, allDocs] = await Promise.all([
    loadFilterContext(db, tenantId),
    db.collection('ept_product_details_new').find(BASE_FILTER).toArray(),
  ]);

  state.context = context;
  state.products = await enrichProductsLight(db, allDocs);
  state.scanComplete = true;
  state.scannedAt = Date.now();
}

// Ensures the tenant's product list is fully scanned+enriched and cached.
// Rescans from scratch only when forced (?refresh=1), the TTL has expired,
// or no scan has completed yet. If a scan is ALREADY in flight for this
// tenant (e.g. another request triggered it a moment ago), concurrent
// callers wait on that same scan instead of starting a second one — this is
// what was causing partial/inconsistent counts (e.g. 166 instead of 223)
// when two requests hit the same tenant at once.
async function getTenantState(db, tenantId, forceRescan = false) {
  const state = getOrCreateTenantState(tenantId);
  const ttlExpired = state.scannedAt && (Date.now() - state.scannedAt > TENANT_CACHE_TTL_MS);
  const needsRescan = forceRescan || ttlExpired || !state.scanComplete;

  if (needsRescan) {
    if (!state.scanPromise) {
      state.scanPromise = runFullScan(db, tenantId, state).finally(() => {
        state.scanPromise = null;
      });
    }
    await state.scanPromise;
  }

  return state;
}

function invalidateTenantCaches(tenantId) {
  tenantCache.delete(tenantId);
}

// Fire-and-forget cache warmup — call this right after tenant/session is
// resolved (e.g. in the login controller) so the scan runs in the
// background while the user is still on another page, instead of blocking
// the first Smart Reports request. Never awaited by the caller.
function warmTenantCache(db, tenantId) {
  getTenantState(db, tenantId, false).catch((err) => {
    console.error('smartReportsController warmup failed for tenant', tenantId, err);
  });
}

// GET /api/smart-reports/tab-counts
exports.getTabCounts = async (req, res) => {
  try {
    const db = req.tenantDb;
    const tenantId = req.tenantId;
    const force = req.query.refresh === '1';

    const state = await getTenantState(db, tenantId, force);
    const counts = countProductsByTab(state.products, state.context);

    const apiCounts = {};
    for (const tab of VALID_TABS) {
      apiCounts[TAB_API_KEYS[tab]] = counts[tab];
    }

    res.json({ counts, ...apiCounts });
  } catch (err) {
    console.error('smartReportsController.getTabCounts error:', err);
    res.status(500).json({ message: err.message });
  }
};

// GET /api/smart-reports?tab=Easy+Gain&page=1&limit=50&search=
exports.getTabProducts = async (req, res) => {
  try {
    const tab = req.query.tab;
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit || '50', 10)));
    const search = (req.query.search || '').trim();
    const force = req.query.refresh === '1';

    if (!VALID_TABS.includes(tab)) {
      return res.status(400).json({ message: 'Invalid tab' });
    }

    const db = req.tenantDb;
    const tenantId = req.tenantId;

    const state = await getTenantState(db, tenantId, force);

    const list = filterProductsForTab(state.products, tab, search, state.context);
    const data = list.slice((page - 1) * limit, page * limit);
    const total = list.length;

    let tabCounts = null;
    if (!search) {
      tabCounts = countProductsByTab(state.products, state.context);
    }

    res.json({
      data,
      total,
      tabCounts,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      hasMore: page * limit < total,
      scanComplete: true,
    });
  } catch (err) {
    console.error('smartReportsController.getTabProducts error:', err);
    res.status(500).json({ message: err.message });
  }
};

// GET /api/smart-reports/product/:ean
exports.getProductDetail = async (req, res) => {
  try {
    const ean = req.params.ean;
    const product = await req.tenantDb
      .collection('ept_product_details_new')
      .findOne({ ...BASE_FILTER, product_ean_id: ean });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const [enriched] = await enrichProducts(req.tenantDb, [product]);
    res.json(enriched);
  } catch (err) {
    console.error('smartReportsController.getProductDetail error:', err);
    res.status(500).json({ message: err.message });
  }
};

// GET /api/smart-reports/export?tab=Easy+Gain&search=
exports.exportTab = async (req, res) => {
  try {
    const requestingUser = await User.findOne({ user_id: req.user.user_id });
    if (requestingUser && requestingUser.export_option === 'no') {
      return res.status(403).json({ message: 'Export is disabled for this account' });
    }

    const tab = req.query.tab;
    const search = (req.query.search || '').trim();

    if (!VALID_TABS.includes(tab)) {
      return res.status(400).json({ message: 'Invalid tab' });
    }

    const db = req.tenantDb;
    const tenantId = req.tenantId;

    // Export always gets fresh data — force a rescan (still race-safe: if a
    // scan is already in flight, this just awaits it instead of racing it).
    const state = await getTenantState(db, tenantId, true);
    let list = filterProductsForTab(state.products, tab, search, state.context);

    if (tab === 'Non Competitors' && list.length) {
      list = await enrichProducts(db, list);
    }

    res.json({ data: list, total: list.length });
  } catch (err) {
    console.error('smartReportsController.exportTab error:', err);
    res.status(500).json({ message: err.message });
  }
};

// Call this from wherever product data gets mutated (price edits, re-scrape,
// tenant re-provisioning, etc.) so stale cached data doesn't linger for the
// full TTL window.
exports.invalidateTenantCaches = invalidateTenantCaches;

// Call this right after tenant/session resolution (e.g. login controller)
// to start scanning in the background before the user opens Smart Reports.
exports.warmTenantCache = warmTenantCache;