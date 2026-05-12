const express        = require('express');
const router         = express.Router();
const auth           = require('../../middleware/auth');
const tenantResolver = require('../../middleware/tenantResolver');
const { getAll, create, update, remove, configureProduct, removeConfiguration, getAlertProducts } = require('../../controllers/tenant/productsController');

router.get('/alert',                      auth, tenantResolver, getAlertProducts);
router.get('/',                           auth, tenantResolver, getAll);
router.post('/',                          auth, tenantResolver, create);
router.put('/:id',                        auth, tenantResolver, update);
router.patch('/:id/configure',            auth, tenantResolver, configureProduct);
router.patch('/:id/remove-configuration', auth, tenantResolver, removeConfiguration);
router.delete('/:id',                     auth, tenantResolver, remove);

module.exports = router;
