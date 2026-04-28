const Merchant = require('../../models/Merchant');
const { registerFeedCron } = require('../../services/cronService');

async function getMerchant(req) {
  if (req.user.userType === 'super_admin') {
    const companyId = req.headers['x-tenant-id'];
    return await Merchant.findOne({ companyId });
  }
  return await Merchant.findOne({ companyId: req.user.companyId });
}

exports.getFeed = async (req, res) => {
  try {
    const merchant = await getMerchant(req);
    if (!merchant) return res.status(404).json({ message: 'Merchant not found' });
    res.json(merchant.feed_info || {});
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.saveFeed = async (req, res) => {
  try {
    if (req.user.userType !== 'super_admin')
      return res.status(403).json({ message: 'Only super admin can update feed configuration' });

    const { feedName, cmsUpload, feedFormat, importUrl, schedule, scheduleTime } = req.body;

    const merchant = await getMerchant(req);
    if (!merchant) return res.status(404).json({ message: 'Merchant not found' });

    await Merchant.findByIdAndUpdate(
      merchant._id,
      {
        $set: {
          feed_info: {
            feed_name:       feedName,
            cms_upload_type: cmsUpload,
            feed_type:       feedFormat,
            feed_url:        importUrl,
            schedule_info:   schedule,
            import_time:     scheduleTime,
          },
        },
      },
      { new: true }
    );

    registerFeedCron(merchant.companyId, {
      _id:          merchant._id,
      feedName,
      importUrl,
      schedule,
      scheduleTime,
    });

    res.json({ message: 'Feed configuration saved' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
