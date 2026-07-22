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
  forgotPassword,
  verifyOtp,
  resetPassword,provisionTenantDb,getPendingSignups,getActivatedCompanies
} = require('../controllers/authController');

router.post('/login',            login);
router.get('/check-email',       checkEmail);
router.get('/check-companyname', checkCompanyName);
router.post('/signup',           signup);
router.post('/seed-super-admin', seedSuperAdmin);
router.post('/forgot-password',  forgotPassword);
router.post('/verify-otp',       verifyOtp);
router.post('/reset-password',   resetPassword);
router.get('/all-stores',        auth, roleCheck('super_admin'), getAllStores);
router.get('/merchant/:companyId', auth, getMerchant);
// ✅ புது routes — Tenant Provisioning
router.get('/pending-signups',              auth, roleCheck('super_admin'), getPendingSignups);
router.post('/provision-tenant/:companyId', auth, roleCheck('super_admin'), provisionTenantDb);
router.get('/activated-companies', auth, roleCheck('super_admin'), getActivatedCompanies);
module.exports = router;
