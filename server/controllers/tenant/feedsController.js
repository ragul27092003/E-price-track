const Merchant        = require('../../models/Merchant');
const { getTenantDb } = require('../../config/db');
const { registerFeedCron } = require('../../services/cronService');

// ── helper ────────────────────────────────────────────────────────────────────
async function getMerchant(req) {
  const companyId = req.headers['x-tenant-id'] || req.user?.companyId;
  return await Merchant.findOne({ companyId });
}

// ── Format raw DB date strings like "2026-04-27 07:15:06am" → "Apr 27, 2026, 07:15 AM"
function formatDate(raw) {
  if (!raw) return '—';
  // Normalize: "2026-04-27 07:15:06am" or "2026-04-27 07:18:24am"
  const cleaned = String(raw)
    .replace(/(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})(am|pm)?/i, (_, d, t, ampm) => {
      return `${d}T${t}`;
    });
  const dt = new Date(cleaned);
  if (isNaN(dt)) return raw; // fallback to raw if unparseable
  return dt.toLocaleString('en-IN', {
    day:    '2-digit',
    month:  'short',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

// ── GET /api/feeds ────────────────────────────────────────────────────────────
exports.getFeed = async (req, res) => {
  try {
    const merchant = await getMerchant(req);
    if (!merchant) return res.status(404).json({ message: 'Merchant not found' });

    // If feed_info doesn't exist yet, auto-create it using companyId as default
    // This handles all existing merchants without requiring manual DB updates
    if (!merchant.feed_info || !merchant.feed_info.store_name) {
      const defaultFeedInfo = {
        store_name:          merchant.companyId,
        feed_name:           merchant.companyId,
        feed_type:           'json',
        feed_url:            '',
        schedule_info:       'Daily',
        import_time:         '12:00 PM',
        cms_upload_type:     'none',
        shopify_name:        '',
        shopify_accesstoken: '',
      };
      await Merchant.findByIdAndUpdate(
        merchant._id,
        { $set: { feed_info: defaultFeedInfo } },
        { new: true }
      );
      return res.json(defaultFeedInfo);
    }

    const fi = merchant.feed_info;
    res.json({
      store_name:          fi.store_name          || merchant.companyId,
      feed_name:           fi.feed_name           || fi.store_name || merchant.companyId,
      feed_type:           fi.feed_type           || 'json',
      feed_url:            fi.feed_url            || '',
      schedule_info:       fi.schedule_info       || 'Daily',
      import_time:         fi.import_time         || '12:00 PM',
      cms_upload_type:     fi.cms_upload_type     || 'none',
      shopify_name:        fi.shopify_name        || '',
      shopify_accesstoken: fi.shopify_accesstoken || '',
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── PUT /api/feeds ────────────────────────────────────────────────────────────
exports.saveFeed = async (req, res) => {
  try {
    const {
      store_name, feed_type, feed_url,
      schedule_info, import_time,
      cms_upload_type, shopify_name, shopify_accesstoken,
    } = req.body;

    const merchant = await getMerchant(req);
    if (!merchant) return res.status(404).json({ message: 'Merchant not found' });

    const isShopify = cms_upload_type === 'shopify';

    const feedInfoUpdate = {
      store_name:          store_name          || merchant.feed_info?.store_name || '',
      feed_type:           isShopify ? ''      : (feed_type || 'json'),
      feed_url:            isShopify ? ''      : (feed_url  || ''),
      schedule_info:       schedule_info       || 'Daily',
      import_time:         import_time         || '12:00 PM',
      cms_upload_type:     cms_upload_type     || 'none',
      shopify_name:        isShopify ? (shopify_name         || '') : '',
      shopify_accesstoken: isShopify ? (shopify_accesstoken  || '') : '',
    };

    await Merchant.findByIdAndUpdate(
      merchant._id,
      { $set: { feed_info: feedInfoUpdate } },
      { new: true }
    );

    if (!isShopify && feed_url) {
      try {
        registerFeedCron(merchant.companyId, {
          _id:          merchant._id,
          feedName:     store_name,
          importUrl:    feed_url,
          schedule:     schedule_info,
          scheduleTime: import_time,
        });
      } catch (e) {
        console.warn('registerFeedCron not available:', e.message);
      }
    }

    res.json({ message: 'Feed configuration saved successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── GET /api/feeds/activity-log ───────────────────────────────────────────────
exports.getActivityLog = async (req, res) => {
  try {
    const merchant = await getMerchant(req);
    if (!merchant) return res.status(404).json({ message: 'Merchant not found' });

    const tenantDb = getTenantDb(merchant.companyId);

    // 1. Feed sync records
    const sapDocs = await tenantDb
      .collection('ept_sap_data_update_status')
      .find({})
      .sort({ created_date: -1 })
      .limit(10)
      .toArray();

    const sapLogs = sapDocs.map((doc) => {
      const allSuccess =
        doc.product_update_status   === 'success' &&
        doc.rank_update_status      === 'success' &&
        doc.dashboard_update_status === 'success';

      const failed = [];
      if (doc.product_update_status   !== 'success') failed.push('product update');
      if (doc.rank_update_status      !== 'success') failed.push('rank update');
      if (doc.dashboard_update_status !== 'success') failed.push('dashboard update');

      return {
        date:    formatDate(doc.created_date || doc.var_start_time),
        status:  allSuccess ? 'Success' : 'Error',
        message: allSuccess
          ? `Feed sync completed. Start: ${formatDate(doc.var_start_time)} → End: ${formatDate(doc.var_end_time)}`
          : `Sync failed: ${failed.join(', ')}`,
        source:  'feed_sync',
      };
    });

    // 2. Competitor cron records
    const cronDocs = await tenantDb
      .collection('ept_cron_time_management')
      .find({})
      .sort({ start_time: -1 })
      .limit(15)
      .toArray();

    const cronLogs = cronDocs.map((doc) => ({
      date:       formatDate(doc.start_time),
      status:     'Success',
      message:    `Scraped ${doc.cron_competitor_name || 'competitor'}: ${doc.update_count || 0} of ${doc.total_count || 0} products updated. Ended: ${formatDate(doc.end_time)}`,
      source:     'cron_scrape',
      competitor: doc.cron_competitor_name || '',
    }));

    // 3. Merge & sort newest first
    const all = [...sapLogs, ...cronLogs]
      .filter((l) => l.date && l.date !== '—')
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 20);

    res.json({ logs: all });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
