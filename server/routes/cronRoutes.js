const express = require('express');
const router  = express.Router();
const { getStatus, runNow } = require('../controllers/cronController');

router.get('/status',            getStatus);
router.post('/run-now/:tenantId', runNow);

module.exports = router;
