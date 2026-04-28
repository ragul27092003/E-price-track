const express        = require('express');
const router         = express.Router();
const auth           = require('../../middleware/auth');
const tenantResolver = require('../../middleware/tenantResolver');
const { getFeedAudit, refreshAudit } = require('../../controllers/tenant/auditController');

router.get('/feed-audit', auth, tenantResolver, getFeedAudit);
router.post('/refresh',   auth, tenantResolver, refreshAudit);

module.exports = router;
