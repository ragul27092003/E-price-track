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

// Mirrors PHP: floatval(trim(preg_replace('/[^a-zA-Z0-9.]/', '', $value)))
function parsePhpPrice(raw) {
  if (raw === null || raw === undefined || raw === '' || raw === 'No Result') return null;
  const n = typeof raw === 'number' ? raw : parseFloat(String(raw).replace(/[^a-zA-Z0-9.]/g, ''));
  return isNaN(n) ? null : n;
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

function findCompanyRankIndex(rankNames, companyId) {
  if (!companyId || !rankNames.length) return -1;
  const target = String(companyId).toLowerCase();
  return rankNames.findIndex((name) => String(name).toLowerCase() === target);
}

function computeTrendHigherBy(product) {
  const rankPos = getRankPos(product);
  if (rankPos === null) return null;

  const ourPrice = parsePhpPrice(product.product_price);
  if (ourPrice === null) return null;

  const rankNames = getRankNames(product);
  const rank1Slug = product.price_rank_1 || rankNames[0];
  const rank1Price = getRankPrice(product, rank1Slug);
  if (rank1Price === null) return null;

  return ourPrice - rank1Price;
}

function getStoredHigherBy(product) {
  const raw = product.higher_by ?? product.user_notification_data?.higher_by;
  if (raw === null || raw === undefined || raw === '') return null;
  const n = parsePhpPrice(raw);
  return n === null ? null : n;
}

function getTrendType(product) {
  if (product.trend_type) return product.trend_type;
  const higherBy = getStoredHigherBy(product) ?? computeTrendHigherBy(product);
  if (higherBy === null) return null;
  if (higherBy === 0) return 'EQUAL_TREND';
  if (higherBy > 0) return 'NEGATIVE_TREND';
  return 'POSITIVE_TREND';
}

function getActiveComps(product) {
  return (product.competitor_prices || []).filter((c) => {
    const hasPrice = parsePhpPrice(c.price) !== null;
    const stockStr = String(c.stock || '').toLowerCase();
    const isOos = !c.stock || stockStr.includes('out of stock') || stockStr === '0';
    return c.is_listed && hasPrice && !isOos;
  });
}

function computeTabRank(product, activeComps, ourPrice) {
  const compPrices = activeComps.map((c) => parsePhpPrice(c.price)).filter((v) => v !== null);
  if (ourPrice === null) return { rank: null, compPrices };
  const rank = compPrices.filter((price) => price <= ourPrice).length + 1;
  return { rank, compPrices };
}

function matchesEasyGain(product) {
  const ourPrice = parsePhpPrice(product.product_price);
  const activeComps = getActiveComps(product);
  const { rank } = computeTabRank(product, activeComps, ourPrice);
  return rank === 1 && activeComps.length > 0;
}

function matchesCleverMove(product, companyId) {
  const rankBy = parseInt(product.rank_by, 10);
  if (isNaN(rankBy) || rankBy <= 1) return false;

  const rankNames = getRankNames(product);
  if (!rankNames.length) return false;

  let compPos = -1;
  const ourPos = findCompanyRankIndex(rankNames, companyId);
  if (ourPos > 0) {
    compPos = ourPos - 1;
  } else if (rankBy > 1 && rankNames.length >= rankBy - 1) {
    // Fallback when company slug in arrrank_name_by differs from tenant id
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

function matchesPositiveTrend(product) {
  const rankBy = parseInt(product.rank_by, 10);
  return !isNaN(rankBy) && rankBy === 1;
}

function matchesNeutralTrend(product) {
  const trendType = getTrendType(product);
  const higherBy = getStoredHigherBy(product) ?? computeTrendHigherBy(product);
  return trendType === 'EQUAL_TREND' && higherBy === 0;
}

function matchesNegativeTrend(product) {
  const higherBy = getStoredHigherBy(product) ?? computeTrendHigherBy(product);
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
  return {
    companyId: tenantId,
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

  const { companyId } = context;

  if (tab === 'Non Competitors') {
    return matchesNonCompetitors(product);
  }

  const ourPrice = parsePhpPrice(product.product_price);
  if (ourPrice === null) return false;

  if (tab === 'Easy Gain') return matchesEasyGain(product);
  if (tab === 'Clever Move') return matchesCleverMove(product, companyId);
  if (tab === 'Positive Trend') return matchesPositiveTrend(product);
  if (tab === 'Neutral Trend') return matchesNeutralTrend(product);
  if (tab === 'Negative Trend') return matchesNegativeTrend(product);

  return false;
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
  loadFilterContext,
  productMatchesTab,
  matchesSearch,
  filterProductsForTab,
};
