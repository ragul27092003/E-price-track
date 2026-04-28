const express = require('express');
const router  = express.Router();
const auth    = require('../../middleware/auth');
const { getFeed, saveFeed } = require('../../controllers/tenant/feedsController');

router.get('/',  auth, getFeed);
router.put('/',  auth, saveFeed);

module.exports = router;
