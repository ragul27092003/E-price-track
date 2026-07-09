const User = require('../../models/User');
const { enrichProducts, enrichProductsLight } = require('../../utils/productEnrichment');
const {
  VALID_TABS,
  TAB_COUNT_FIELDS,
  productMatchesTab,
  matchesSearch,
  filterProductsForTab,
} = require('../../utils/smartReportFilter');

const SCAN_BATCH = 100;
const scanCache = new Map();

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
    scanCache.set(key, { products: [], scanSkip: 0, scanComplete: false });
  }
  return scanCache.get(key);
}

async function scanMoreProducts(db, tab, state) {
  const col = db.collection('ept_product_details_new');

  while (!state.scanComplete) {
    const batch = await col.find(BASE_FILTER).skip(state.scanSkip).limit(SCAN_BATCH).toArray();
    if (!batch.length) {
      state.scanComplete = true;
      break;
    }

    const enriched = await enrichProductsLight(db, batch);
    for (const product of enriched) {
      if (productMatchesTab(product, tab)) {
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
    await scanMoreProducts(db, tab, state);
    if (state.scanComplete) break;
  }

  return state;
}

async function ensureAllProducts(db, tenantId, tab) {
  const state = getOrCreateScanState(tenantId, tab);

  while (!state.scanComplete) {
    await scanMoreProducts(db, tab, state);
  }

  return state;
}

async function getTabCountFromStats(db, tab) {
  const docs = await db
    .collection('ept_dashboard_overall_statistics')
    .find({ status: 'active' })
    .sort({ _id: -1 })
    .limit(1)
    .toArray();

  if (!docs.length) return 0;
  const field = TAB_COUNT_FIELDS[tab];
  return docs[0][field] ?? 0;
}

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
      await scanMoreProducts(db, tab, state);
      list = state.products.filter((p) => matchesSearch(p, search));
    }

    const data = list.slice((page - 1) * limit, page * limit);
    if (!search) {
      // Keep tab count consistent with export by using the same live filter source.
      // This completes a full scan once and then serves from cache.
      await ensureAllProducts(db, tenantId, tab);
      list = state.products;
    }

    const total = list.length;

    const hasMore = search
      ? list.length > page * limit || !state.scanComplete
      : state.products.length > page * limit || !state.scanComplete;

    res.json({
      data,
      total,
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
    // Always rebuild this tab cache for export to avoid stale in-memory matches.
    scanCache.delete(cacheKey(tenantId, tab));
    const state = await ensureAllProducts(db, tenantId, tab);
    let list = filterProductsForTab(state.products, tab, search);

    if (tab === 'Non Competitors' && list.length) {
      list = await enrichProducts(db, list);
    }

    res.json({ data: list, total: list.length });
  } catch (err) {
    console.error('smartReportsController.exportTab error:', err);
    res.status(500).json({ message: err.message });
  }
};
