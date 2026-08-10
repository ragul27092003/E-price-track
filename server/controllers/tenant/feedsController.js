const Merchant             = require('../../models/Merchant');
const { registerFeedCron } = require('../../services/cronService');

// ── helper ────────────────────────────────────────────────────────────────────
async function getMerchant(req) {
  const cmpid = req.headers['x-tenant-id'] || req.user?.cmpid;
  return await Merchant.findOne({ cmpid });
}

// ── Format raw DB date strings like "2026-04-27 07:15:06am" or
// "2026-07-20 04:01:17PM" → "20 Jul 2026, 04:01 PM"
//
// FIX: the previous version captured the am/pm suffix with the regex but
// then discarded it when building the ISO-ish string ("${d}T${t}"), so
// `new Date(...)` always parsed the hour as 24-hour clock. Any PM time
// other than 12 PM (e.g. 04:01:17PM) rendered as AM in the UI, while AM
// times happened to look correct by coincidence. We now explicitly convert
// the 12-hour hour + am/pm into the correct 24-hour hour ourselves instead
// of relying on Date() to infer it.
function formatDate(raw) {
  if (!raw) return '—';

  const match = String(raw).match(
    /(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})\s*(am|pm)?/i
  );

  let dt;
  if (match) {
    const [, y, mo, d, hRaw, mi, s, ampm] = match;
    let h = parseInt(hRaw, 10);

    if (ampm) {
      const isPM = ampm.toLowerCase() === 'pm';
      if (isPM && h !== 12) h += 12;   // 1 PM–11 PM → 13–23
      if (!isPM && h === 12) h = 0;    // 12 AM (midnight) → 0
    }
    // No am/pm suffix present: assume the stored hour is already 24-hour.

    dt = new Date(Number(y), Number(mo) - 1, Number(d), h, Number(mi), Number(s));
  } else {
    dt = new Date(raw);
  }

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

function parseCustomDate(str) {
  if (!str) return null;
  if (str instanceof Date) return isNaN(str) ? null : str;
  const fixed = str.replace(/(AM|PM)$/i, ' $1'); // add space before AM/PM so Date() can parse it
  const d = new Date(fixed);
  return isNaN(d) ? null : d;
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
        store_name:          merchant.cmpid,
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
      store_name:          fi.store_name          || merchant.cmpid,
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
    const now = new Date();
    const formatteddate =
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ` +
      `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

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
      modified_on:         formatteddate
    };

    await Merchant.findByIdAndUpdate(
      merchant._id,
      { $set: { feed_info: feedInfoUpdate } },
      { new: true }
    );

    if (!isShopify && feed_url) {
      try {
        registerFeedCron(merchant.cmpid, {
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
    const tenantDb = req.tenantDb;

    const sapDocs = await tenantDb
      .collection('ept_sap_data_update_status')
      .find({})
      .sort({ created_date: -1 })
      .limit(20)
      .toArray();

    const logs = sapDocs.map((doc) => {
      const productStatus = doc.product_update_status || 'queue';
      const rankStatus = doc.rank_update_status || 'queue';
      const priceNotificationStatus = doc.price_notification_update_status || 'queue';
      const dashboardStatus = doc.dashboard_update_status || 'queue';

      const allSuccess = 
        productStatus === 'success' &&
        rankStatus === 'success' &&
        priceNotificationStatus === 'success' &&
        dashboardStatus === 'success';

      const anyFailed = 
        productStatus === 'failed' ||
        rankStatus === 'failed' ||
        priceNotificationStatus === 'failed' ||
        dashboardStatus === 'failed';

      const anyProcessing = 
        productStatus === 'process' ||
        rankStatus === 'process' ||
        priceNotificationStatus === 'process' ||
        dashboardStatus === 'process';

      let overallStatus = 'Queue';
      if (allSuccess) overallStatus = 'Success';
      else if (anyFailed) overallStatus = 'Failed';
      else if (anyProcessing) overallStatus = 'Processing';

      const isRunning = overallStatus === 'Queue' || overallStatus === 'Processing';

      const failedSteps = [];
      if (productStatus === 'failed') failedSteps.push('Product Update');
      if (rankStatus === 'failed') failedSteps.push('Rank Update');
      if (priceNotificationStatus === 'failed') failedSteps.push('Dashboard Update');
      if (dashboardStatus === 'failed') failedSteps.push('Price Notification');

      let message = '';
      if (allSuccess) {
        message = 'All steps completed successfully.';
      } else if (failedSteps.length > 0) {
        message = `Failed (${failedSteps.join(', ')})`;
      } else if (anyProcessing) {
        message = 'Processing...';
      } else {
        message = 'Queued.';
      }

      const totalSteps = 4;
      const completedSteps = [
        productStatus === 'success',
        rankStatus === 'success',
        priceNotificationStatus === 'success',
        dashboardStatus === 'success'
      ].filter(Boolean).length;
      const progress = Math.round((completedSteps / totalSteps) * 100);

      return {
        date: (doc.created_date || doc.var_start_time),
        started_at: (doc.var_start_time), // ✅ New separate field
        ended_at: (doc.var_end_time),     // ✅ New separate field
        status: overallStatus,
        isRunning: isRunning,
        message: message,
        progress: progress,
        isComplete: allSuccess,
        steps: [
          { id: 'product', label: 'Product Update', status: productStatus, icon: 'product' },
          { id: 'rank', label: 'Rank Update', status: rankStatus, icon: 'rank' },
          { id: 'price_notification', label: 'Price Notification', status: priceNotificationStatus, icon: 'notification' },
          { id: 'dashboard', label: 'Dashboard Update', status: dashboardStatus, icon: 'dashboard' }
        ]
      };
    });

    res.json({ logs: logs }); 
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── GET /api/feeds/competitor-activity-log ─────────────────────────────────
exports.getCompetitorActivityLog = async (req, res) => {
  try {
    const tenantDb = req.tenantDb;

    // Fetch logos once, build a lookup map: competitor_name (lowercase) -> logo
    const statsDocs = await tenantDb
      .collection('ept_dashbaord_statics')
      .find({ status: 'active' })
      .toArray();

    const baseUrl = `${req.protocol}://${req.get('host')}`; // adjust if using a fixed BASE_URL env var
    const logoMap = {};
    statsDocs.forEach((d) => {
      const key = (d.competitor_name || d.competitors || '').toLowerCase().trim();
      if (key && d.competitor_logo) {
        logoMap[key] = d.competitor_logo.startsWith('http')
          ? d.competitor_logo
          : `${baseUrl}${d.competitor_logo}`;
      }
    });

    const cronDocs = await tenantDb
      .collection('ept_cron_time_management')
      .find({})
      .sort({ start_time: -1 })
      .limit(200)
      .toArray();

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const cronLogs = cronDocs
      .map((doc) => {
        const competitorKey = (doc.cron_competitor_name || '').toLowerCase().trim();
        return {
          date:       formatDate(doc.start_time),
          status:     'Success',
          message:    `Scraped ${doc.cron_competitor_name || 'competitor'}: ${doc.update_count || 0} of ${doc.total_count || 0} products updated. Ended: ${formatDate(doc.end_time)}`,
          source:     'cron_scrape',
          competitor: doc.cron_competitor_name || '',
          logo:       logoMap[competitorKey] || null,   // 👈 attach logo here
          _rawDate:   doc.start_time,
        };
      })
      .filter((l) => l.date && l.date !== '—')
      .filter((l) => l.competitor.trim() !== '')
      .filter((l) => {
        const d = parseCustomDate(l._rawDate);
        return d && d >= sevenDaysAgo;
      })
      .sort((a, b) => parseCustomDate(b._rawDate) - parseCustomDate(a._rawDate))
      .map(({ _rawDate, ...rest }) => rest);

    res.json({ logs: cronLogs });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};