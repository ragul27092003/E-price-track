const express        = require('express');
const router         = express.Router();
const auth           = require('../../middleware/auth');
const tenantResolver = require('../../middleware/tenantResolver');
const {
  getTabProducts,
  getProductDetail,
  getTabCounts,
  exportTab,
  getEasyGainPercentage,
  updateEasyGainPercentageHandler,
} = require('../../controllers/tenant/smartReportsController');

// Only super_admin can change the Easy Gain threshold — everyone on the
// tenant can view it, but changing it affects what the whole store sees.
const requireAdmin = (req, res, next) => {
  if (req.user.user_type !== 'super_admin') {
    return res.status(403).json({ message: 'Access denied' });
  }
  next();
};

router.get('/tab-counts',                auth, tenantResolver, getTabCounts);
router.get('/export',                    auth, tenantResolver, exportTab);
router.get('/product/:ean',              auth, tenantResolver, getProductDetail);
router.get('/easy-gain-percentage',      auth, tenantResolver, getEasyGainPercentage);
router.put('/easy-gain-percentage',      auth, requireAdmin, tenantResolver, updateEasyGainPercentageHandler);
router.get('/',                          auth, tenantResolver, getTabProducts);

module.exports = router;
