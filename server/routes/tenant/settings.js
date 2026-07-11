const express = require('express');
const router  = express.Router();
const auth    = require('../../middleware/auth');
const {
  getProfile,
  updateProfile,
  updatePassword,
  updateLogo,
  getUsers,
  addUser,
  removeUser,
  getUsersLog,
  getLogFilterUsers,
  uploadStoreLogo: uploadStoreLogoHandler,
} = require('../../controllers/tenant/settingsController');
const tenantResolver = require('../../middleware/tenantResolver');
const uploadStoreLogo = require('../../middleware/uploadStoreLogo');

// Only store_admin / super_admin can manage the store logo — plain 'user'
// accounts get a 403 before hitting tenantResolver, multer/Cloudinary, or the DB.
const requireAdmin = (req, res, next) => {
  if (!['super_admin', 'store_admin'].includes(req.user.user_type)) {
    return res.status(403).json({ message: 'Access denied' });
  }
  next();
};

router.get('/profile',              auth, tenantResolver, getProfile);
router.put('/profile',              auth, tenantResolver, updateProfile);
router.put('/password',             auth, tenantResolver, updatePassword);
router.put('/logo',                 auth, requireAdmin, tenantResolver, updateLogo);
router.get('/users',                auth, tenantResolver, getUsers);   
router.post('/add-user',            auth, tenantResolver, addUser);
router.delete('/users/:user_id',    auth, tenantResolver, removeUser);
router.get('/users-log',            auth, getUsersLog);
router.get('/log-users',            auth, getLogFilterUsers);
router.post('/logo-upload', auth, requireAdmin, uploadStoreLogo.single('logo'), uploadStoreLogoHandler);


module.exports = router;