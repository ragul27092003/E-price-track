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
} = require('../../controllers/tenant/settingsController');

router.get('/profile',         auth, getProfile);
router.put('/profile',         auth, updateProfile);
router.put('/password',        auth, updatePassword);
router.put('/logo',            auth, updateLogo);
router.get('/users',           auth, getUsers);
router.post('/add-user',       auth, addUser);
router.delete('/users/:user_id', auth, removeUser);
router.get('/users-log',       auth, getUsersLog);

module.exports = router;
