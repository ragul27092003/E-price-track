const express        = require('express');
const router         = express.Router();
const auth           = require('../../middleware/auth');
const tenantResolver = require('../../middleware/tenantResolver');
const roleCheck      = require('../../middleware/roleCheck');
const upload         = require('../../middleware/upload');
const controller     = require('../../controllers/tenant/competitorsController');

// Debug — remove after confirming it works
const { getAll, create, toggleSync, uploadLogo, debugMapping } = controller;
if (!uploadLogo)  throw new Error('uploadLogo is undefined — replace competitorsController.js from the zip');
if (!upload)      throw new Error('upload is undefined — run: npm install multer  inside server/');

router.get('/',  auth, tenantResolver, getAll);
// Temporary debug route — shows raw mapping_type from both DBs
// GET /api/competitors/debug-mapping  (remove after confirming fix)
router.get('/debug-mapping', auth, tenantResolver, debugMapping);
router.post('/', auth, tenantResolver, create);

// IMPORTANT: /:slug/logo MUST be before /:id/toggle
// otherwise Express matches /amazon/logo as id=amazon and misses it
router.patch('/:slug/logo',   auth, roleCheck('super_admin'), upload.single('logo'), uploadLogo);
router.patch('/:id/toggle',   auth, tenantResolver, toggleSync);

module.exports = router;
