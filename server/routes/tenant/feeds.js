const express = require('express');
const router  = express.Router();
const auth    = require('../../middleware/auth');
const { getFeed, saveFeed, getActivityLog } = require('../../controllers/tenant/feedsController');

router.get('/',              auth, getFeed);
router.put('/',              auth, saveFeed);
router.get('/activity-log',  auth, getActivityLog);

module.exports = router;
