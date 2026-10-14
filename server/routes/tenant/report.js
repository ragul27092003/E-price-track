const express        = require('express');
const router         = express.Router();
const auth           = require('../../middleware/auth');
const tenantResolver = require('../../middleware/tenantResolver');

const {
    getProductcountData,
    getNotification,
    getRandomProductData
} = require('../../controllers/tenant/reportController');

router.get('/product-data', auth, tenantResolver, getProductcountData);
router.get('/user-notifications', auth, tenantResolver, getNotification);
router.get('/RandomProduct', auth, tenantResolver, getRandomProductData);

module.exports = router;