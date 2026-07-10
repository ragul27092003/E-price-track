const { toPrice } = require('./productEnrichment');

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

function isActiveProduct(product) {
  return (
    product.status === 'active' &&
    product.ean_product_data_details_scrap_status === 'completed'
  );
}

// Mirrors productEnrichment.js's isExplicitlyOosStock — a competitor whose
// live stock string says "out of stock" (or "0") must not be treated as the
// "next competitor" for Easy Gain, even though it still counts for ranking.
function isOutOfStock(comp) {
  const s = String(comp.stock ?? '').toLowerCase();
  return s.includes('out of stock') || s === '0';
}

function getOurPrice(product) {
  return toPrice(product.product_price);
}

// Only competitors that are actually listed with a real price count — this
// is the SAME live data (built by enrichProductsLight/enrichProducts) that
// drives the Rank badge and price panel on screen, so tab classification
// can never disagree with what the user sees on the product page again.
function getLiveCompetitors(product) {
  return (product.competitor_prices || [])
    .filter((c) => c && c.is_listed && c.price !== null && c.price !== undefined)
    .map((c) => ({ ...c, price: toPrice(c.price) }))
    .filter((c) => c.price !== null)
    .sort((a, b) => a.price - b.price);
}

// Single pass that computes everything the tab rules need for a product:
// our price, the live-sorted competitor list, our live rank, and the
// competitor sitting directly "above" us (the one we need to beat/match).
function getLiveTrendContext(product) {
  const ourPrice = getOurPrice(product);
  if (ourPrice === null) return null;

  const sorted = getLiveCompetitors(product);
  const cheaperOrEqualCount = sorted.filter((c) => c.price <= ourPrice).length;
  const rank = cheaperOrEqualCount + 1;
  const aboveIdx = cheaperOrEqualCount - 1;
  const aboveComp = aboveIdx >= 0 && aboveIdx < sorted.length ? sorted[aboveIdx] : null;

  return { ourPrice, sorted, rank, aboveComp };
}

// ── Positive Trend: we are currently rank 1 ─────────────────────────────────
function matchesPositiveTrend(product) {
  const ctx = getLiveTrendContext(product);
  return !!ctx && ctx.rank === 1;
}

// ── Easy Gain ────────────────────────────────────────────────────────────────
// Rules: we must be rank 1 right now. Compare against the cheapest competitor
// who actually has a live, IN-STOCK price — out-of-stock competitors are
// skipped, not just the fixed "rank 2" slot. The gap must clear the
// per-store easyGainPercentage threshold (0 if the store has no override).
function matchesEasyGain(product, easyGainPercentage = 0) {
  const ctx = getLiveTrendContext(product);
  if (!ctx || ctx.rank !== 1) return false;

  const nextComp = ctx.sorted.find((c) => !isOutOfStock(c));
  if (!nextComp) return false;

  const compPrice = nextComp.price;
  if (ctx.ourPrice > compPrice) return false;

  const percentageDifference = Math.round(((compPrice - ctx.ourPrice) / compPrice) * 100);
  if (percentageDifference < easyGainPercentage) return false;

  return compPrice - ctx.ourPrice !== 0;
}

// ── Clever Move ──────────────────────────────────────────────────────────────
// We are NOT rank 1, but we're matching or just ₹1 above the competitor
// immediately above us — a tiny price drop would leapfrog them.
function matchesCleverMove(product) {
  const ctx = getLiveTrendContext(product);
  if (!ctx || ctx.rank <= 1 || !ctx.aboveComp) return false;

  const difference = ctx.ourPrice - ctx.aboveComp.price;
  return difference === 0 || difference === 1;
}

// ── Non Competitors: nobody with a live, listed price to compare against ────
function matchesNonCompetitors(product) {
  return getLiveCompetitors(product).length === 0;
}

// ── Neutral Trend: tied in price with EVERY competitor ranked at-or-above us ─
// Not enough for just the immediately-above competitor to match — if any
// competitor between us and rank 1 has a different (lower) price, we're
// not truly tied, we're just tied with one of several distinct price points.
// e.g. Amazon 1999 (rank1), Croma 2000 (rank2), us 2000 (rank3) -> NOT neutral,
// because Amazon's 1999 breaks the tie. Only 1999/1999/1999 all-round is neutral.
function matchesNeutralTrend(product) {
  const ctx = getLiveTrendContext(product);
  if (!ctx || ctx.rank <= 1) return false;

  // All competitors priced <= us (i.e. ranked ahead of/tied with us) — since
  // ctx.sorted is ascending, these are exactly the first (rank - 1) entries.
  const previousComps = ctx.sorted.slice(0, ctx.rank - 1);
  if (previousComps.length === 0) return false;

  return previousComps.every((c) => c.price === ctx.ourPrice);
}

// ── Negative Trend: priced higher than AT LEAST ONE competitor ranked
// at-or-above us — i.e. higher_by > 0 against any of them, not just the
// immediately-above one. This is the natural complement of Neutral Trend:
// previousComps are all <= ourPrice by definition, so if they're not ALL
// equal to us (Neutral), at least one must be strictly cheaper than us.
// e.g. Amazon 1999 (rank1), Croma 2000 (rank2), us 2000 (rank3) -> Negative,
// because we're higher_by 1 against Amazon even though tied with Croma.
function matchesNegativeTrend(product) {
  const ctx = getLiveTrendContext(product);
  if (!ctx || ctx.rank <= 1) return false;

  const previousComps = ctx.sorted.slice(0, ctx.rank - 1);
  if (previousComps.length === 0) return false;

  return previousComps.some((c) => c.price < ctx.ourPrice);
}

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Per-store Easy Gain % lives in the shared admin database, not the tenant
// stats collection: plm_admin_manage_info.plm_admin_companies.trend_report.easy_gain.percentage
// Falls back to 0 when the store has no override / no trend_report field at all.
async function loadEasyGainPercentage(db, tenantId) {
  try {
    const adminDb = db.client.db('plm_admin_manage_info');
    const col = adminDb.collection('plm_admin_companies');

    let companyDoc = await col.findOne({ cmpid: tenantId }, { projection: { trend_report: 1 } });
    if (!companyDoc) {
      companyDoc = await col.findOne(
        { cmpid: { $regex: `^${escapeRegex(tenantId)}$`, $options: 'i' } },
        { projection: { trend_report: 1 } }
      );
    }

    const pct = companyDoc?.trend_report?.easy_gain?.percentage;
    return typeof pct === 'number' && !isNaN(pct) ? pct : 0;
  } catch {
    return 0;
  }
}

async function loadFilterContext(db, tenantId) {
  const easyGainPercentage = await loadEasyGainPercentage(db, tenantId);
  return { easyGainPercentage };
}

function productMatchesTab(product, tab, context = {}) {
  if (!VALID_TABS.includes(tab)) return false;
  if (!isActiveProduct(product)) return false;

  const easyGainPercentage = context.easyGainPercentage ?? 0;

  if (tab === 'Non Competitors') return matchesNonCompetitors(product);
  if (tab === 'Easy Gain')       return matchesEasyGain(product, easyGainPercentage);
  if (tab === 'Clever Move')     return matchesCleverMove(product);
  if (tab === 'Positive Trend')  return matchesPositiveTrend(product);
  if (tab === 'Neutral Trend')   return matchesNeutralTrend(product);
  if (tab === 'Negative Trend')  return matchesNegativeTrend(product);

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