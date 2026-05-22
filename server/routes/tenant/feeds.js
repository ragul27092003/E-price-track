const express        = require('express');
const router         = express.Router();
const auth           = require('../../middleware/auth');
const tenantResolver = require('../../middleware/tenantResolver');
const { getFeed, saveFeed, getActivityLog } = require('../../controllers/tenant/feedsController');

router.get('/',             auth, getFeed);
router.put('/',             auth, saveFeed);
router.get('/activity-log', auth, tenantResolver, getActivityLog);

module.exports = router;
