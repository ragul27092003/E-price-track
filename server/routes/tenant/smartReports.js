const express        = require('express');
const router         = express.Router();
const auth           = require('../../middleware/auth');
const tenantResolver = require('../../middleware/tenantResolver');
const {
  getTabProducts,
  getProductDetail,
  exportTab,
} = require('../../controllers/tenant/smartReportsController');

router.get('/export',           auth, tenantResolver, exportTab);
router.get('/product/:ean',     auth, tenantResolver, getProductDetail);
router.get('/',                 auth, tenantResolver, getTabProducts);

module.exports = router;
