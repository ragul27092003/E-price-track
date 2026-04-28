const { getCronStatus } = require('../services/cronService');

exports.getStatus = (req, res) => {
  const status = getCronStatus();
  res.json({ success: true, ...status });
};

exports.runNow = async (req, res) => {
  try {
    const { tenantId } = req.params;

    const mainDb  = require('mongoose').connection.useDb('gmc_main_admin_db');
    const company = await mainDb.collection('gmc_admin_companies').findOne({ store_id: tenantId });

    if (!company)
      return res.json({ success: false, message: 'Company not found' });

    const { importFeedForTenant } = require('../services/cronService');
    importFeedForTenant(tenantId, {
      _id:          company._id,
      feedName:     company.shopName,
      importUrl:    company.feed_info.feed_url,
      schedule:     company.feed_info.schedule_info,
      scheduleTime: company.feed_info.import_time,
    });

    res.json({ success: true, message: `Cron triggered for tenant: ${tenantId}` });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};
