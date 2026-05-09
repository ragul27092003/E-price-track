const mongoose = require('mongoose');
const { getTenantDb } = require('../config/db');

exports.getFeedAudit = async (req, res) => {
  try {
    const { role, store_id } = req.user;

    const tenantId = role === 'super_admin' ? req.query.store_id : store_id;
    if (!tenantId)
      return res.status(400).json({ success: false, message: 'store_id is required' });

    const tenantDb    = getTenantDb(tenantId);
    const auditCol    = tenantDb.collection('feed_audit_products');
    const productsCol = tenantDb.collection('products');

    const totalProducts = await productsCol.countDocuments({ tenantId, is_active: true });
    const auditDocs     = await auditCol.find({}).toArray();

    const grouped = { high: {}, medium: {}, low: {}, others: {} };

    for (const doc of auditDocs) {
      for (const issue of doc.issues) {
        const p = issue.priority;
        if (!grouped[p]) continue;
        if (!grouped[p][issue.label]) {
          grouped[p][issue.label] = { issue: issue.label, field: issue.field, products: 0 };
        }
        grouped[p][issue.label].products += 1;
      }
    }

    const result = {};
    for (const priority in grouped) {
      result[priority] = Object.values(grouped[priority]).map(item => ({
        ...item,
        percentage: `${Math.round((item.products / (totalProducts || 1)) * 100)}%`,
      }));
    }

    const penalty     = result.high.length * 3 + result.medium.length;
    const healthScore = Math.max(0, Math.round(100 - (penalty / 30) * 100));
    const allIssues   = Object.values(result).flat();

    res.json({
      success: true,
      data: {
        totalProducts,
        totalIssues:  allIssues.length,
        healthScore,
        issues:       result,
        lastChecked:  new Date(),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.refreshAudit = async (req, res) => {
  try {
    const { role, store_id } = req.user;

    const tenantId = role === 'super_admin' ? req.query.store_id : store_id;
    if (!tenantId)
      return res.status(400).json({ success: false, message: 'store_id is required' });

    const mainDb  = mongoose.connection.useDb('eprice_main_admin_db');
    const company = await mainDb.collection('merchants').findOne({ companyId: tenantId });

    if (!company)
      return res.status(404).json({ success: false, message: 'Company not found' });

    const { importFeedForTenant } = require('../services/cronService');
    importFeedForTenant(tenantId, {
      _id:          company._id,
      feedName:     company.shopName,
      importUrl:    company.feed_info.feed_url,
      schedule:     company.feed_info.schedule_info,
      scheduleTime: company.feed_info.import_time,
    });

    res.json({ success: true, message: 'Audit refresh started' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getStores = async (req, res) => {
  try {
    if (req.user.role !== 'super_admin')
      return res.status(403).json({ success: false, message: 'Access denied' });

    const mainDb    = mongoose.connection.useDb('eprice_main_admin_db');
    const companies = await mainDb.collection('merchants')
      .find({ role: 'store_admin' })
      .project({ store_id: 1, shopName: 1, _id: 0 })
      .toArray();

    res.json({ success: true, data: companies });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
