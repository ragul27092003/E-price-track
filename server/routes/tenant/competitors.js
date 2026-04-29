const express        = require('express');
const router         = express.Router();
const auth           = require('../../middleware/auth');
const tenantResolver = require('../../middleware/tenantResolver');
const { getAll, create, toggleSync } = require('../../controllers/tenant/competitorsController');

router.get('/',             auth, tenantResolver, getAll);
router.post('/',            auth, tenantResolver, create);
router.patch('/:id/toggle', auth, tenantResolver, toggleSync);

module.exports = router;
