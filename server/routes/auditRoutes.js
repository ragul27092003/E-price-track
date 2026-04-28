const express      = require('express');
const router       = express.Router();
const verifyToken  = require('../middleware/auth');
const { getFeedAudit, refreshAudit, getStores } = require('../controllers/auditController');

router.get('/feed-audit', verifyToken, getFeedAudit);
router.post('/refresh',   verifyToken, refreshAudit);
router.get('/stores',     verifyToken, getStores);

module.exports = router;
