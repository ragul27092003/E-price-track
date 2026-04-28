const Merchant = require('../../models/Merchant');
const { importFeedForTenant } = require('../../services/cronService');

exports.getFeedAudit = async (req, res) => {
  try {
    const tenantDb    = req.tenantDb;
    const auditCol    = tenantDb.collection('feed_audit_products');
    const productsCol = tenantDb.collection('products');

    const totalProducts = await productsCol.countDocuments({ is_active: true });

    if (totalProducts === 0) {
      return res.json({
        success: true,
        data: {
          totalProducts: 0,
          totalIssues:   0,
          healthScore:   100,
          issues: { high: [], medium: [], low: [], others: [] },
        },
      });
    }

    const auditDocs = await auditCol.find({}).toArray();
    const issueMap  = {};

    for (const doc of auditDocs) {
      for (const issue of (doc.issues || [])) {
        const key = issue.label;
        if (!issueMap[key]) {
          issueMap[key] = { issue: key, priority: issue.priority, products: 0 };
        }
        issueMap[key].products++;
      }
    }

    const grouped = { high: [], medium: [], low: [], others: [] };
    for (const item of Object.values(issueMap)) {
      const pct   = Math.round((item.products / totalProducts) * 100);
      const entry = { issue: item.issue, products: item.products, percentage: `${pct}%` };
      grouped[item.priority] ? grouped[item.priority].push(entry) : grouped.others.push(entry);
    }

    const totalIssues = Object.values(grouped).flat().length;
    const healthScore = Math.max(0, Math.round(100 - (totalIssues / 11) * 100));

    res.json({ success: true, data: { totalProducts, totalIssues, healthScore, issues: grouped } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.refreshAudit = async (req, res) => {
  try {
    const merchant = await Merchant.findOne({ companyId: req.tenantId });
    if (!merchant || !merchant.feed_info?.feed_url) {
      return res.status(400).json({
        success: false,
        message: 'No feed URL configured. Please set up feed first.',
      });
    }

    await importFeedForTenant(req.tenantId, {
      _id:          merchant._id,
      feedName:     merchant.feed_info.feed_name,
      importUrl:    merchant.feed_info.feed_url,
      schedule:     merchant.feed_info.schedule_info,
      scheduleTime: merchant.feed_info.import_time,
    });

    res.json({ success: true, message: 'Feed refreshed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
