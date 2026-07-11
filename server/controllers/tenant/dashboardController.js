const { buildAlertQuery } = require('../../utils/alertquery');


exports.getRankAnalysis = async (req, res) => {
  try {
    const docs = await req.tenantDb
      .collection('ept_dashboard_rank_analysis')
      .find({ 'competitor_rank1_count.status': 'active' })
      .sort({ _id: -1 })
      .limit(1)
      .toArray();

    if (!docs.length) return res.json(null);

    const inner   = docs[0].competitor_rank1_count || {};
    const rawData = inner.competitor_rank1_data    || {};
    const competitors = Object.entries(rawData).map(([name, count]) => ({ name, count }));

    res.json({
      date: inner.competitor_rank1_modified_date || inner.display_date || '--',
      competitors,
    });
  } catch (err) {
    console.error('dashboardController.getRankAnalysis error:', err);
    res.status(500).json({ message: err.message });
  }
};

// ─── GET /api/dashboard/brand-analytics/brands ───────────────────────────────
exports.getBrandAnalyticsBrands = async (req, res) => {
  try {
    const brands = await req.tenantDb
      .collection('ept_dashboard_price_analysis')
      .distinct('brand_name');
    res.json(brands.filter(Boolean).sort());
  } catch (err) {
    console.error('dashboardController.getBrandAnalyticsBrands error:', err);
    res.status(500).json({ message: err.message });
  }
};

// ─── GET /api/dashboard/brand-analytics?brand=X&category=Y ───────────────────
exports.getBrandAnalytics = async (req, res) => {
  try {
    const { brand, category } = req.query;
    if (!brand) return res.json({ categories: [], data: null });

    const docs = await req.tenantDb
      .collection('ept_dashboard_price_analysis')
      .find({ brand_name: brand })
      .toArray();

    // Exclude "all_category" from the dropdown — it's not a real category,
    // it's the pre-aggregated "All Category" summary document
    const categories = [...new Set(
      docs.map((d) => d.category_name).filter((c) => c && c !== 'all_category')
    )].sort();

    const selectedCategory = category || 'all_category';
    const record = docs.find((d) => d.category_name === selectedCategory);

    res.json({ categories, data: record?.price_analysis_data || null });
  } catch (err) {
    console.error('dashboardController.getBrandAnalytics error:', err);
    res.status(500).json({ message: err.message });
  }
};

// ─── GET /api/dashboard/sap-status ───────────────────────────────────────────
exports.getSapUpdateStatus = async (req, res) => {
  try {
    const docs = await req.tenantDb
      .collection('ept_sap_data_update_status')
      .find({ status: 'active' })
      .sort({ _id: -1 })
      .limit(1)
      .toArray();

    if (!docs.length) return res.json({ var_end_time: null });
    res.json({ var_end_time: docs[0].var_end_time || null });
  } catch (err) {
    console.error('dashboardController.getSapUpdateStatus error:', err);
    res.status(500).json({ message: err.message });
  }
};

// ─── GET /api/dashboard/web-update-status ────────────────────────────────────
// Only relevant for nandilathgmart — daily web scrape/update success-failure status
exports.getWebUpdateStatus = async (req, res) => {
  try {
    const docs = await req.tenantDb
      .collection('ept_web_product_update_status')
      .find({})
      .sort({ _id: -1 })
      .limit(1)
      .toArray();

    if (!docs.length) return res.json({ status: null, var_end_time: null });

    const doc = docs[0];
    res.json({
      status: doc.product_update_status || null, // 'success' | 'failed' | null
      var_end_time: doc.var_end_time || null,
    });
  } catch (err) {
    console.error('dashboardController.getWebUpdateStatus error:', err);
    res.status(500).json({ message: err.message });
  }
};

// ─── GET /api/dashboard/overall-statistics ───────────────────────────────────
exports.getOverallStatistics = async (req, res) => {
  try {
    const docs = await req.tenantDb
      .collection('ept_dashboard_overall_statistics')
      .find({ status: 'active' })
      .sort({ _id: -1 })
      .limit(1)
      .toArray();

    if (!docs.length) return res.json(null);

    let varNotificationCounts = docs[0].varNotificationCounts ?? 0;
    try {
      const alertquery = await buildAlertQuery(req);
      varNotificationCounts = alertquery
        ? await req.tenantDb.collection('ept_product_details_new').countDocuments(alertquery)
        : 0;
    } catch (countErr) {
      console.error('dashboardController.getOverallStatistics notification count error:', countErr);
    }

    res.json({ ...docs[0], varNotificationCounts });
  } catch (err) {
    console.error('dashboardController.getOverallStatistics error:', err);
    res.status(500).json({ message: err.message }); // fixed typo bug (was .jsongetCompetitorActivityLog)
  }
};

// ─── GET /api/dashboard/competitor-counts ───────────────────────────────────
exports.getCompetitorCounts = async (req, res) => {
  try {
    const docs = await req.tenantDb
      .collection('ept_dashbaord_statics')
      .find({ status: 'active' })
      .toArray();
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    const formatted = docs.map((d) => {
      const rawCount = d.competitor_count?.$numberLong || d.competitor_count?.toString() || 0;
      const logo = d.competitor_logo
        ? (d.competitor_logo.startsWith('http') ? d.competitor_logo : `${baseUrl}${d.competitor_logo}`)
        : null;
      return {
        id: d._id,
        name: d.competitors || d.competitor_name,
        logo,
        count: parseInt(rawCount, 10) || 0,
        color: d.competitor_color
      };
    });

    formatted.sort((a, b) => b.count - a.count);
    res.json(formatted);
  } catch (err) {
    console.error('dashboardController.getCompetitorCounts error:', err);
    res.status(500).json({ message: err.message });
  }
};