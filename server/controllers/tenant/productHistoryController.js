// ─── Product History Controller ───────────────────────────────────────────────
// GET /api/product-history/:ean
// Reads from:
//   - ept_product_details_new           → product name, image, price, brand
//   - ept_product_price_chart_info_new  → 30-day price history per competitor

const COLOR_MAP = {
  sathyamobiles:   '#00ACC1', 
  suryaelectronics:'#FBC02D',  
  amazon:          '#F57C00', 
  croma:           '#6D4C41',
  supreme_mobiles: '#8E24AA', 
  reliancedigital: '#212121', 
  flipkart:        '#1E88E5', 
  vijaysales:      '#E53935',
  poorvika:        '#D81B60', 
  vasanth:         '#388E3C',
  bajaj:           '#757575', 
};
const FALLBACK_COLORS = ['#1e40af','#065f46','#7c2d12','#4c1d95','#d97706','#dc2626','#0891b2'];

exports.getByEan = async (req, res) => {
  try {
    const db  = req.tenantDb;
    const ean = req.params.ean;

    // ── 1. Product details ────────────────────────────────────────────────────
    const product = await db
      .collection('ept_product_details_new')
      .findOne({ product_ean_id: ean });

    if (!product) {
      return res.status(404).json({ message: `Product not found for EAN: ${ean}` });
    }

    // ── 2. Price chart document ───────────────────────────────────────────────
    const chartDoc = await db
      .collection('ept_product_price_chart_info_new')
      .findOne({ product_ean_id: ean });

    // No history yet → return product info with empty history
    if (!chartDoc || !chartDoc.last_seven_days_info) {
      return res.json({
        product: buildProductInfo(product),
        dates:   [],
        series:  [],
        stats:   { min: null, max: null, deviation: null },
        tableData: { columns: [], rows: [] },
        insights: { lowestPriceSeller: null, stabilityScore: null },
      });
    }

    const info      = chartDoc.last_seven_days_info;
    const dates     = info.option?.xaxis?.ticks || [];   // e.g. ["2026-03-28", ..., "2026-04-27"]
    const rawSeries = info.data || {};                   // { sathyamobiles: { data:[], name, color }, ... }

    // ── 3. Build chart series ─────────────────────────────────────────────────
    let fallbackIdx = 0;
    const series = Object.entries(rawSeries).map(([slug, sdata]) => ({
      key:    slug,
      name:   sdata.name || slug,
      color:  sdata.color || COLOR_MAP[slug] || FALLBACK_COLORS[fallbackIdx++ % FALLBACK_COLORS.length],
      values: sdata.data || [],   // one price per date tick
    }));

    // ── 4. Identify our own series vs competitors ─────────────────────────────
    const tenantId     = req.tenantId || '';
    const ourSlug      = series.find(s => s.key === tenantId || s.key.includes('sathya') || s.key.includes('surya'));
    const ourLastPrice = ourSlug ? (ourSlug.values[ourSlug.values.length - 1] || null) : null;

    const competitorSeries = series.filter(s => s.key !== ourSlug?.key);
    const compLastPrices   = competitorSeries
      .map(s => s.values[s.values.length - 1])
      .filter(v => v != null && v > 0);

    // ── 5. Stats ──────────────────────────────────────────────────────────────
    const minPrice = compLastPrices.length ? Math.min(...compLastPrices) : null;
    const maxPrice = compLastPrices.length ? Math.max(...compLastPrices) : null;

    let deviation = null;
    if (ourLastPrice && compLastPrices.length) {
      const avgComp = compLastPrices.reduce((a, b) => a + b, 0) / compLastPrices.length;
      deviation = Math.round(Math.abs(ourLastPrice - avgComp));
    }

    // ── 6. Insights ───────────────────────────────────────────────────────────
    // Lowest price seller from last date
    let lowestPriceSeller = null;
    let lowestPrice       = null;
    series.forEach(s => {
      const lastVal = s.values[s.values.length - 1];
      if (lastVal && (lowestPrice === null || lastVal < lowestPrice)) {
        lowestPrice       = lastVal;
        lowestPriceSeller = s.name;
      }
    });

    // Price stability: % of days where our price didn't change
    let stabilityScore = null;
    if (ourSlug && ourSlug.values.length > 1) {
      const vals    = ourSlug.values.filter(v => v > 0);
      const changes = vals.filter((v, i) => i > 0 && v !== vals[i - 1]).length;
      stabilityScore = Math.round(((vals.length - changes) / vals.length) * 100);
    }

    // ── 7. Table: dates × competitors ────────────────────────────────────────
    const tableColumns = series.map(s => ({ key: s.key, name: s.name, color: s.color }));
    const tableRows    = dates.map((date, i) => {
      const prices = {};
      series.forEach(s => { prices[s.key] = s.values[i] ?? null; });
      return { date, prices };
    });

    // ── 8. Respond ────────────────────────────────────────────────────────────
    res.json({
      product:  buildProductInfo(product),
      dates,
      series,
      stats:    { min: minPrice, max: maxPrice, deviation },
      tableData: { columns: tableColumns, rows: tableRows },
      insights: {
        lowestPriceSeller,
        lowestPrice,
        stabilityScore,
      },
    });
  } catch (err) {
    console.error('productHistoryController.getByEan error:', err);
    res.status(500).json({ message: err.message });
  }
};

// ─── helper ───────────────────────────────────────────────────────────────────
function buildProductInfo(product) {
  return {
    name:  product.product_name  || 'Unknown Product',
    code:  product.product_code  || '',
    ean:   product.product_ean_id || '',
    mpn:   product.product_mpn   || '',
    image: product.product_image || null,
    price: product.product_sap_price || product.product_store_price || product.product_price || null,
    brand: product.product_brand    || '',
    category: product.product_category || '',
    stock: product.product_stock_status || product.product_stock || '',
  };
}
