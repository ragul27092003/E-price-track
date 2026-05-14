// ─── GET /api/dashboard/rank-analysis ────────────────────────────────────────
exports.getRankAnalysis = async (req, res) => {
  try {
    // status is nested: competitor_rank1_count.status
    const docs = await req.tenantDb
      .collection('ept_dashboard_rank_analysis')
      .find({ 'competitor_rank1_count.status': 'active' })
      .sort({ _id: -1 })
      .limit(1)
      .toArray();

    if (!docs.length) return res.json(null);

    const inner   = docs[0].competitor_rank1_count || {};
    const rawData = inner.competitor_rank1_data    || {};

    // Transform { amazon: 6, croma: 3 } → [{ name, count }]
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

    const categories = [...new Set(docs.map((d) => d.category_name).filter(Boolean))].sort();
    const selectedCategory = category || categories[0];
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
    res.json(docs[0]);
  } catch (err) {
    console.error('dashboardController.getOverallStatistics error:', err);
    res.status(500).json({ message: err.message });
  }
};
