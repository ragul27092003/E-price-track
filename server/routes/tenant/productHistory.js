const express        = require('express');
const router         = express.Router();
const auth           = require('../../middleware/auth');
const tenantResolver = require('../../middleware/tenantResolver');
const { getByEan }   = require('../../controllers/tenant/productHistoryController');

// GET /api/product-history/:ean
router.get('/:ean', auth, tenantResolver, getByEan);

module.exports = router;
