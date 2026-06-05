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
  getCompetitorCounts // <--- 1. Ensure this is imported
} = require('../../controllers/tenant/dashboardController');

router.get('/sap-status',                 auth, tenantResolver, getSapUpdateStatus);
router.get('/overall-statistics',         auth, tenantResolver, getOverallStatistics);
router.get('/rank-analysis',              auth, tenantResolver, getRankAnalysis);
router.get('/brand-analytics/brands',     auth, tenantResolver, getBrandAnalyticsBrands);
router.get('/brand-analytics',            auth, tenantResolver, getBrandAnalytics);

// <--- 2. Ensure this exact line is added and the file is SAVED
router.get('/competitor-counts',          auth, tenantResolver, getCompetitorCounts); 

module.exports = router;