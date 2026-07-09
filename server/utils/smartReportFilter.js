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

function toPrice(raw) {
  if (raw === null || raw === undefined || raw === 'No Result' || raw === '') return null;
  const n = typeof raw === 'number' ? raw : parseFloat(raw);
  return isNaN(n) ? null : n;
}

function getActiveComps(product) {
  return (product.competitor_prices || []).filter((c) => {
    const hasPrice = toPrice(c.price) !== null;
    const stockStr = String(c.stock || '').toLowerCase();
    const isOos = !c.stock || stockStr.includes('out of stock') || stockStr === '0';
    return c.is_listed && hasPrice && !isOos;
  });
}

function computeTabRank(product, activeComps, ourPrice) {
  const compPrices = activeComps.map((c) => toPrice(c.price)).filter((v) => v !== null);
  if (ourPrice === null) return { rank: null, compPrices };
  const rank = compPrices.filter((price) => price <= ourPrice).length + 1;
  return { rank, compPrices };
}

function productMatchesTab(product, tab) {
  if (!VALID_TABS.includes(tab)) return false;

  const activeComps = getActiveComps(product);
  const ourPrice = toPrice(product.product_price);

  if (tab === 'Non Competitors') {
    return activeComps.length === 0;
  }

  if (ourPrice === null) return false;

  const { rank, compPrices } = computeTabRank(product, activeComps, ourPrice);

  if (tab === 'Positive Trend') {
    if (product.status !== 'active') return false;
    if (product.ean_product_data_details_scrap_status !== 'completed') return false;
    return rank === 1;
  }

  if (tab === 'Negative Trend') {
    if (product.status !== 'active') return false;
    if (product.ean_product_data_details_scrap_status !== 'completed') return false;
    return activeComps.length > 0 && rank >= 2;
  }

  if (tab === 'Easy Gain') {
    if (product.status !== 'active') return false;
    if (product.ean_product_data_details_scrap_status !== 'completed') return false;
    return rank === 1 && activeComps.length > 0;
  }


// CRITERIA 4: Clever Move (Strategic Match with 1 Rupee Undercut Tolerance)
// if (activeTab === "Clever Move") {
//   const isActive = p.status === "active";
//   const isScrapCompleted = p.ean_product_data_details_scrap_status === "completed";
//   if (!isActive || !isScrapCompleted) return false;

//   if (compPrices.length === 0 || ourPrice === null) return false;

//   // Rule 1: We must never be Rank 1
//   if (rank === 1) return false;

//   // Rule 2: Check if our price matches a competitor tier exactly OR undercuts it by up to 1 rupee
//   const matchesCompetitorTier = compPrices.some((price) => {
//     const priceDiff = price - ourPrice;
//     // Returns true if same price (0) or if we are 1 rupee cheaper (1)
//     return priceDiff >= 0 && priceDiff <= 1;
//   });

//   return matchesCompetitorTier;
// }

  if (tab === 'Clever Move') {
    if (product.status !== 'active') return false;
    if (product.ean_product_data_details_scrap_status !== 'completed') return false;
    if (compPrices.length === 0 || ourPrice === null) return false;
    if (rank === 1) return false;

    const matchesCompetitorTier = compPrices.some((price) => {
      const priceDiff = price - ourPrice;
      return priceDiff >= 0 && priceDiff <= 1;
    });

    return matchesCompetitorTier;
  }

  if (tab === 'Neutral Trend') {
    if (compPrices.length === 0) return false;
    const lowestCompPrice = Math.min(...compPrices);
    return ourPrice === lowestCompPrice;
  }

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

function filterProductsForTab(products, tab, search = '') {
  return products.filter((p) => productMatchesTab(p, tab) && matchesSearch(p, search));
}

module.exports = {
  VALID_TABS,
  TAB_COUNT_FIELDS,
  productMatchesTab,
  matchesSearch,
  filterProductsForTab,
};
