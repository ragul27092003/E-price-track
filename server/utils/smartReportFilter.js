const VALID_TABS = [
  'Easy Gain',
  'Clever Move',
  'Non Competitors',
  'Positive Trend',
  'Neutral Trend',
  'Negative Trend',
];

const TAB_COUNT_FIELDS = {
  'Easy Gain':       'varEasyGainCount',
  'Clever Move':     'varCleverMoveCount',
  'Non Competitors': 'varNonCompetitorCount',
  'Positive Trend':  'varPostiveTrendingCount',
  'Neutral Trend':   'varEqualTrendingCount',
  'Negative Trend':  'varNegativeTrendingCount',
};

const TAB_API_KEYS = {
  'Easy Gain':       'easyGain',
  'Clever Move':     'cleverMove',
  'Non Competitors': 'nonCompetitors',
  'Positive Trend':  'positiveTrend',
  'Neutral Trend':   'neutralTrend',
  'Negative Trend':  'negativeTrend',
};

// Mirrors PHP: floatval(trim(preg_replace('/[^a-zA-Z0-9.]/', '', $value)))
function parsePhpPrice(raw) {
  if (raw === null || raw === undefined || raw === '' || raw === 'No Result') return null;
  const n = typeof raw === 'number' ? raw : parseFloat(String(raw).replace(/[^a-zA-Z0-9.]/g, ''));
  if (isNaN(n) || n <= 0) return null;
  return n;
}

function isActiveProduct(product) {
  return (
    product.status === 'active' &&
    product.ean_product_data_details_scrap_status === 'completed'
  );
}

function getRankPos(product) {
  const raw = product.user_notification_data?.rank_pos ?? product.rank_pos ?? product.rank_by;
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim();
  return s === '' ? null : s;
}

function getCompetitorDetailsPrice(product, slug) {
  if (!slug) return null;
  const details = product[`${slug}_details`];
  if (!Array.isArray(details) || !details.length) return null;
  return parsePhpPrice(details[0]?.product_price);
}

function getRankPrice(product, slug) {
  if (!slug) return null;
  const detailsPrice = getCompetitorDetailsPrice(product, slug);
  if (detailsPrice !== null) return detailsPrice;

  const rankPrices = product.arrrank_price_by;
  if (!rankPrices) return null;
  if (typeof rankPrices === 'object' && !Array.isArray(rankPrices)) {
    return parsePhpPrice(rankPrices[slug]);
  }
  return parsePhpPrice(rankPrices[slug]);
}

function getRankNames(product) {
  return Array.isArray(product.arrrank_name_by) ? product.arrrank_name_by : [];
}

function findCompanyRankIndex(rankNames, companyIds = []) {
  const ids = Array.isArray(companyIds) ? companyIds : [companyIds];
  for (const companyId of ids) {
    if (!companyId) continue;
    const target = String(companyId).toLowerCase();
    const idx = rankNames.findIndex((name) => String(name).toLowerCase() === target);
    if (idx >= 0) return idx;
  }
  return -1;
}

function getStoredHigherBy(product) {
  const raw = product.higher_by ?? product.user_notification_data?.higher_by;
  if (raw === null || raw === undefined || raw === '') return null;
  const n = parsePhpPrice(raw);
  return n === null ? null : n;
}

function computeTrendHigherBy(product) {
  if (getRankPos(product) === null) return null;

  const ourPrice = parsePhpPrice(product.product_price);
  if (ourPrice === null) return null;

  const rankNames = getRankNames(product);
  const rank1Slug = product.price_rank_1 || rankNames[0];
  const rank1Price = getRankPrice(product, rank1Slug);
  if (rank1Price === null) return null;

  return ourPrice - rank1Price;
}

function getTrendHigherBy(product) {
  return getStoredHigherBy(product) ?? computeTrendHigherBy(product);
}

// ── PHP: ESY_GN ─────────────────────────────────────────────────────────────
function matchesEasyGain(product, easyGainPercentage = 0) {
  const ourPrice = parsePhpPrice(product.product_price);
  const rank2Slug = product.price_rank_2;
  const rank2Price = getCompetitorDetailsPrice(product, rank2Slug);

  if (ourPrice === null || ourPrice <= 0 || rank2Price === null || rank2Price <= 0) {
    return false;
  }
  if (ourPrice > rank2Price) return false;

  const percentageDifference = Math.round(((rank2Price - ourPrice) / rank2Price) * 100);
  if (percentageDifference < easyGainPercentage) return false;

  const higherBy = rank2Price - ourPrice;
  return higherBy !== 0;
}

// ── PHP: CLVR_MV ────────────────────────────────────────────────────────────
function matchesCleverMove(product, companyIds) {
  const rankBy = parseInt(product.rank_by, 10);
  if (isNaN(rankBy) || rankBy <= 1) return false;

  const rankNames = getRankNames(product);
  if (!rankNames.length) return false;

  let compPos = -1;
  const ourPos = findCompanyRankIndex(rankNames, companyIds);
  if (ourPos > 0) {
    compPos = ourPos - 1;
  } else if (rankBy > 1 && rankNames.length >= rankBy - 1) {
    compPos = rankBy - 2;
  }

  if (compPos < 0) return false;

  const compSlug = rankNames[compPos];
  const compPrice = getRankPrice(product, compSlug);
  const ourPrice = parsePhpPrice(product.product_price);

  if (compPrice === null || ourPrice === null) return false;
  if (compPrice > ourPrice) return false;

  const difference = ourPrice - compPrice;
  return difference === 0 || difference === 1;
}

// ── PHP: Non competitors (no priced competitors in rank map) ────────────────
function matchesNonCompetitors(product) {
  const rankNames = getRankNames(product);
  if (!rankNames.length) return true;
  if (rankNames.length === 1) return true;

  const rankPrices = product.arrrank_price_by;
  if (!rankPrices || typeof rankPrices !== 'object') return rankNames.length <= 1;

  const pricedCompetitors = Object.entries(rankPrices).filter(([, price]) => {
    const p = parsePhpPrice(price);
    return p !== null && p > 0;
  });

  return pricedCompetitors.length === 0;
}

// ── PHP: POS_TREND — rank 1 ─────────────────────────────────────────────────
function matchesPositiveTrend(product) {
  const rankBy = parseInt(product.rank_by, 10);
  return !isNaN(rankBy) && rankBy === 1;
}

// ── PHP: EQL_TREND ──────────────────────────────────────────────────────────
function matchesNeutralTrend(product) {
  const trendType = product.trend_type;
  const higherBy = getTrendHigherBy(product);
  if (trendType) {
    return trendType === 'EQUAL_TREND' && higherBy === 0;
  }
  return higherBy === 0 && getRankNames(product).length > 1;
}

// ── PHP: NGV_TREND ──────────────────────────────────────────────────────────
function matchesNegativeTrend(product) {
  const stored = product.higher_by ?? product.user_notification_data?.higher_by;
  if (stored !== null && stored !== undefined && String(stored).trim() !== '') {
    const n = parsePhpPrice(stored);
    return n !== null && n !== 0;
  }
  const higherBy = computeTrendHigherBy(product);
  return higherBy !== null && higherBy > 0;
}

async function loadFilterContext(db, tenantId) {
  const docs = await db
    .collection('ept_dashboard_overall_statistics')
    .find({ status: 'active' })
    .sort({ _id: -1 })
    .limit(1)
    .toArray();

  const stats = docs[0] || {};

  const companyIds = [tenantId];
  if (stats.company_id) companyIds.push(stats.company_id);
  if (stats.cmpid) companyIds.push(stats.cmpid);
  if (stats.store_slug) companyIds.push(stats.store_slug);

  try {
    const ownComp = await db.collection('ept_competitor_info').findOne({
      competitor_status: 'enable',
      $or: [
        { competitor_slug: tenantId },
        { cmpid: tenantId },
      ],
    });
    if (ownComp?.competitor_slug) companyIds.push(ownComp.competitor_slug);
  } catch {
    // optional lookup
  }

  const uniqueCompanyIds = [...new Set(companyIds.filter(Boolean))];

  return {
    companyId: tenantId,
    companyIds: uniqueCompanyIds,
    easyGainPercentage:
      stats.varEasyGainPercentage ??
      stats.var_easy_gain_percentage ??
      stats.varEasyGainPercentThreshold ??
      0,
  };
}

function productMatchesTab(product, tab, context = {}) {
  if (!VALID_TABS.includes(tab)) return false;
  if (!isActiveProduct(product)) return false;

  const companyIds = context.companyIds || [context.companyId].filter(Boolean);
  const easyGainPercentage = context.easyGainPercentage ?? 0;

  if (tab === 'Non Competitors') {
    return matchesNonCompetitors(product);
  }

  const ourPrice = parsePhpPrice(product.product_price);
  if (ourPrice === null) return false;

  if (tab === 'Easy Gain') return matchesEasyGain(product, easyGainPercentage);
  if (tab === 'Clever Move') return matchesCleverMove(product, companyIds);
  if (tab === 'Positive Trend') return matchesPositiveTrend(product);
  if (tab === 'Neutral Trend') return matchesNeutralTrend(product);
  if (tab === 'Negative Trend') return matchesNegativeTrend(product);

  return false;
}

function countProductsByTab(products, context = {}) {
  const counts = Object.fromEntries(VALID_TABS.map((tab) => [tab, 0]));
  for (const product of products) {
    for (const tab of VALID_TABS) {
      if (productMatchesTab(product, tab, context)) {
        counts[tab]++;
      }
    }
  }
  return counts;
}

function matchesSearch(product, search) {
  if (!search || !search.trim()) return true;
  const query = search.toLowerCase().trim();
  return (
    (product.product_name || '').toLowerCase().includes(query) ||
    (product.product_brand || '').toLowerCase().includes(query) ||
    (product.product_ean_id || '').toLowerCase().includes(query) ||
    (product.product_code || '').toLowerCase().includes(query)
  );
}

function filterProductsForTab(products, tab, search = '', context = {}) {
  return products.filter((p) => productMatchesTab(p, tab, context) && matchesSearch(p, search));
}

module.exports = {
  VALID_TABS,
  TAB_COUNT_FIELDS,
  TAB_API_KEYS,
  loadFilterContext,
  productMatchesTab,
  countProductsByTab,
  matchesSearch,
  filterProductsForTab,
};
