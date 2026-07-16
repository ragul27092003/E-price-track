const express        = require('express');
const router         = express.Router();
const auth           = require('../../middleware/auth');
const tenantResolver = require('../../middleware/tenantResolver');
const { getAll, getMeta, create, update, remove, pendingMapping,configureProduct, removeConfiguration, getAlertProducts, exportAll, webPriceUpdation } = require('../../controllers/tenant/productsController');

router.get('/alert',                      auth, tenantResolver, getAlertProducts);
router.get('/meta',                       auth, tenantResolver, getMeta);
router.get('/',                           auth, tenantResolver, getAll);
router.post('/',                          auth, tenantResolver, create);
router.get('/export',                     auth, tenantResolver, exportAll);
router.put('/:id',                        auth, tenantResolver, update);
router.patch('/:id/configure',            auth, tenantResolver, configureProduct);
router.patch('/:id/remove-configuration', auth, tenantResolver, removeConfiguration);
router.delete('/:id',                     auth, tenantResolver, remove);
router.post('/pendingmapping',            auth, tenantResolver, pendingMapping);
router.post('/webpriceupdation',          auth, tenantResolver, webPriceUpdation);

module.exports = router;
