const express        = require('express');
const router         = express.Router();
const auth           = require('../../middleware/auth');
const tenantResolver = require('../../middleware/tenantResolver');
const {
  getSapUpdateStatus,
  getOverallStatistics,
  getRankAnalysis,
  getBrandAnalyticsBrands,
  getBrandAnalytics,
} = require('../../controllers/tenant/dashboardController');

router.get('/sap-status',                 auth, tenantResolver, getSapUpdateStatus);
router.get('/overall-statistics',         auth, tenantResolver, getOverallStatistics);
router.get('/rank-analysis',              auth, tenantResolver, getRankAnalysis);
router.get('/brand-analytics/brands',     auth, tenantResolver, getBrandAnalyticsBrands);
router.get('/brand-analytics',            auth, tenantResolver, getBrandAnalytics);

module.exports = router;
