const User = require('../../models/User');
const { enrichProducts, enrichProductsLight } = require('../../utils/productEnrichment');
const {
  VALID_TABS,
  TAB_API_KEYS,
  loadFilterContext,
  productMatchesTab,
  countProductsByTab,
  matchesSearch,
  filterProductsForTab,
} = require('../../utils/smartReportFilter');

const SCAN_BATCH = 100;
const scanCache = new Map();
const tabCountCache = new Map();

const BASE_FILTER = {
  status: 'active',
  ean_product_data_details_scrap_status: 'completed',
};

function cacheKey(tenantId, tab) {
  return `${tenantId}:${tab}`;
}

function getOrCreateScanState(tenantId, tab) {
  const key = cacheKey(tenantId, tab);
  if (!scanCache.has(key)) {
    scanCache.set(key, {
      products: [],
      scanSkip: 0,
      scanComplete: false,
      context: null,
    });
  }
  return scanCache.get(key);
}

async function ensureContext(db, tenantId, state) {
  if (!state.context) {
    state.context = await loadFilterContext(db, tenantId);
  }
  return state.context;
}

async function scanMoreProducts(db, tab, state, tenantId) {
  const col = db.collection('ept_product_details_new');
  const context = await ensureContext(db, tenantId, state);

  while (!state.scanComplete) {
    const batch = await col.find(BASE_FILTER).skip(state.scanSkip).limit(SCAN_BATCH).toArray();
    if (!batch.length) {
      state.scanComplete = true;
      break;
    }

    const enriched = await enrichProductsLight(db, batch);
    for (const product of enriched) {
      if (productMatchesTab(product, tab, context)) {
        state.products.push(product);
      }
    }

    state.scanSkip += batch.length;
    if (batch.length < SCAN_BATCH) {
      state.scanComplete = true;
      break;
    }

    return;
  }
}

async function ensureProducts(db, tenantId, tab, minCount) {
  const state = getOrCreateScanState(tenantId, tab);

  while (state.products.length < minCount && !state.scanComplete) {
    await scanMoreProducts(db, tab, state, tenantId);
    if (state.scanComplete) break;
  }

  return state;
}

async function ensureAllProducts(db, tenantId, tab) {
  const state = getOrCreateScanState(tenantId, tab);

  while (!state.scanComplete) {
    await scanMoreProducts(db, tab, state, tenantId);
  }

  return state;
}

async function computeAllTabCounts(db, tenantId) {
  const context = await loadFilterContext(db, tenantId);
  const counts = Object.fromEntries(VALID_TABS.map((tab) => [tab, 0]));
  const col = db.collection('ept_product_details_new');
  let skip = 0;

  while (true) {
    const batch = await col.find(BASE_FILTER).skip(skip).limit(SCAN_BATCH).toArray();
    if (!batch.length) break;

    const enriched = await enrichProductsLight(db, batch);
    const batchCounts = countProductsByTab(enriched, context);
    for (const tab of VALID_TABS) {
      counts[tab] += batchCounts[tab];
    }

    skip += batch.length;
    if (batch.length < SCAN_BATCH) break;
  }

  const apiCounts = {};
  for (const tab of VALID_TABS) {
    apiCounts[TAB_API_KEYS[tab]] = counts[tab];
  }

  return { counts, apiCounts, context };
}

async function getCachedTabCounts(db, tenantId, force = false) {
  if (!force && tabCountCache.has(tenantId)) {
    return tabCountCache.get(tenantId);
  }

  const result = await computeAllTabCounts(db, tenantId);
  tabCountCache.set(tenantId, result);
  return result;
}

function invalidateTenantCaches(tenantId) {
  for (const key of [...scanCache.keys()]) {
    if (key.startsWith(`${tenantId}:`)) scanCache.delete(key);
  }
  tabCountCache.delete(tenantId);
}

// GET /api/smart-reports/tab-counts
exports.getTabCounts = async (req, res) => {
  try {
    const db = req.tenantDb;
    const tenantId = req.tenantId;
    const force = req.query.refresh === '1';
    const { counts, apiCounts } = await getCachedTabCounts(db, tenantId, force);
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

    if (!VALID_TABS.includes(tab)) {
      return res.status(400).json({ message: 'Invalid tab' });
    }

    const db = req.tenantDb;
    const tenantId = req.tenantId;
    const needed = page * limit;
    const state = await ensureProducts(db, tenantId, tab, needed);

    let list = search
      ? state.products.filter((p) => matchesSearch(p, search))
      : state.products;

    while (search && list.length < needed && !state.scanComplete) {
      await scanMoreProducts(db, tab, state, tenantId);
      list = state.products.filter((p) => matchesSearch(p, search));
    }

    const data = list.slice((page - 1) * limit, page * limit);
    let tabCounts = null;
    if (!search) {
      await ensureAllProducts(db, tenantId, tab);
      list = state.products;
      const freshCounts = await getCachedTabCounts(db, tenantId, true);
      tabCounts = freshCounts.counts;
      // Keep the active tab count in sync with the scanned product list
      tabCounts[tab] = list.length;
    }

    const total = list.length;

    const hasMore = search
      ? list.length > page * limit || !state.scanComplete
      : state.products.length > page * limit || !state.scanComplete;

    res.json({
      data,
      total,
      tabCounts,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      hasMore,
      scanComplete: state.scanComplete,
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
    const context = await loadFilterContext(db, tenantId);

    invalidateTenantCaches(tenantId);
    const state = await ensureAllProducts(db, tenantId, tab);
    let list = filterProductsForTab(state.products, tab, search, context);

    if (tab === 'Non Competitors' && list.length) {
      list = await enrichProducts(db, list);
    }

    res.json({ data: list, total: list.length });
  } catch (err) {
    console.error('smartReportsController.exportTab error:', err);
    res.status(500).json({ message: err.message });
  }
};
