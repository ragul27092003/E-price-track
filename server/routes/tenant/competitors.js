const express = require('express');
const router  = express.Router();
const { getAll, create, toggleSync } = require('../../controllers/tenant/competitorsController');

router.get('/',              getAll);
router.post('/',             create);
router.patch('/:id/toggle',  toggleSync);

module.exports = router;
