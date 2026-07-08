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


router.get('/profile',              auth, tenantResolver, getProfile);
router.put('/profile',              auth, tenantResolver, updateProfile);
router.put('/password',             auth, tenantResolver, updatePassword);
router.put('/logo',                 auth, tenantResolver, updateLogo);
router.get('/users',                auth, tenantResolver, getUsers);   
router.post('/add-user',            auth, tenantResolver, addUser);
router.delete('/users/:user_id',    auth, tenantResolver, removeUser);
router.get('/users-log',            auth, getUsersLog);
router.get('/log-users',            auth, getLogFilterUsers);
router.post('/logo-upload', auth, uploadStoreLogo.single('logo'), uploadStoreLogoHandler);


module.exports = router;