const express        = require('express');
const router         = express.Router();
const auth           = require('../../middleware/auth');
const tenantResolver = require('../../middleware/tenantResolver');
const { getAll, create, update, remove } = require('../../controllers/tenant/titleRulesController');

router.get('/',       auth, tenantResolver, getAll);
router.post('/',      auth, tenantResolver, create);
router.put('/:id',    auth, tenantResolver, update);
router.delete('/:id', auth, tenantResolver, remove);

module.exports = router;
