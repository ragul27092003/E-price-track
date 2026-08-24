const express        = require('express');
const router         = express.Router();
const auth           = require('../../middleware/auth');
const tenantResolver = require('../../middleware/tenantResolver');
const { getAll, getMeta, create, update, remove, pendingMapping,configureProduct, removeConfiguration, getAlertProducts, exportAll, webPriceUpdation, fullsiteMapping, fullsiteMappingUpdation, completedProductsExport, importFullsiteMapping, deleteProductCompetitor,updateProductCompetitor } = require('../../controllers/tenant/productsController');
const multer = require("multer");
const upload = multer({dest: "uploads/",});

router.get('/alert',                      auth, tenantResolver, getAlertProducts);
router.get('/meta',                       auth, tenantResolver, getMeta);
router.get('/',                           auth, tenantResolver, getAll);
router.post('/',                          auth, tenantResolver, create);
router.get('/export',                     auth, tenantResolver, exportAll);
router.put('/:id',                        auth, tenantResolver, update);
router.patch('/:id/configure',            auth, tenantResolver, configureProduct);
router.patch('/:id/remove-configuration', auth, tenantResolver, removeConfiguration);
router.delete('/:id',                     auth, tenantResolver, remove);
router.delete('/deleteproductcompetitor/:id',auth,tenantResolver,deleteProductCompetitor);
router.put('/updateproductcompetitor/:id',auth,tenantResolver,updateProductCompetitor);
router.post('/pendingmapping',            auth, tenantResolver, pendingMapping);
router.post('/webpriceupdation',          auth, tenantResolver, webPriceUpdation);
router.get('/fullsitemapping',            auth, tenantResolver, fullsiteMapping);
router.post('/fullsitemapping/update',    auth, tenantResolver, fullsiteMappingUpdation);
router.get('/completedproductsexport',    auth,  tenantResolver, completedProductsExport);
router.post('/importFullsiteMapping',     auth, tenantResolver, upload.single("file"),
  importFullsiteMapping
);

module.exports = router;
