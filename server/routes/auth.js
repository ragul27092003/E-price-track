const express    = require('express');
const router     = express.Router();
const auth       = require('../middleware/auth');
const roleCheck  = require('../middleware/roleCheck');
const {
  login,
  checkEmail,
  checkCompanyName,
  signup,
  seedSuperAdmin,
  getAllStores,
  getMerchant,
} = require('../controllers/authController');

router.post('/login',            login);
router.get('/check-email',       checkEmail);
router.get('/check-companyname', checkCompanyName);
router.post('/signup',           signup);
router.post('/seed-super-admin', seedSuperAdmin);
router.get('/all-stores',        auth, roleCheck('super_admin'), getAllStores);
router.get('/merchant/:companyId', auth, getMerchant);

module.exports = router;
