const mongoose = require('mongoose');
const User = require('../../models/User');
const Access = require('../../models/Access');
const Company = require('../../models/Company');

exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.userId;

    if (req.user.userType === 'super_admin') {
      const tenantId   = req.headers['x-tenant-id'];
      const superAdmin = await User.findOne({ userId }).select('email');

      if (tenantId) {
        const storeUser = await User.findOne({ companyId: tenantId, userType: 'store_admin' });
        if (storeUser) return res.json({ ...storeUser.toObject(), email: superAdmin?.email || '' });
      }

      const admin = await User.findOne({ userId });
      return res.json(admin);
    }

    const user = await User.findOne({ userId });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { phone } = req.body;
    await User.findOneAndUpdate(
      { userId: req.user.userId },
      { $set: { phone, updatedAt: new Date() } }
    );
    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updatePassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword)
      return res.status(400).json({ message: 'New password is required' });
    if (newPassword.length < 8)
      return res.status(400).json({ message: 'Minimum 8 characters required' });
    if (!/[A-Z]/.test(newPassword))
      return res.status(400).json({ message: 'Must contain at least one uppercase letter' });
    if (!/[0-9]/.test(newPassword))
      return res.status(400).json({ message: 'Must contain at least one number' });

    let userId = req.user.userId;

    if (req.user.userType === 'super_admin') {
      const tenantId = req.headers['x-tenant-id'];
      if (tenantId) {
        const storeUser = await User.findOne({ companyId: tenantId, userType: 'store_admin' });
        if (storeUser) userId = storeUser.userId;
      }
    }

    const user = await User.findOne({ userId });
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.plainPassword = newPassword;  // store plain text separately
    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const companyId = req.user.userType === 'super_admin'
      ? req.headers['x-tenant-id']
      : req.user.companyId;

    if (!companyId) return res.status(400).json({ message: 'Company ID is required' });

    const company = await Company.findOne({ companyId });
    if (!company) return res.status(404).json({ message: 'Store not found' });

    const users = await User.find({
      companyId,
      userType: 'user',
      userId:   { $ne: req.user.userId },
    }).select('-password');

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.addUser = async (req, res) => {
  try {
    if (!['super_admin', 'store_admin'].includes(req.user.userType))
      return res.status(403).json({ message: 'Access denied' });

    const { email, password, userName } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: 'Email and password are required' });

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Email already registered' });

    const targetCompanyId = req.user.userType === 'super_admin'
      ? req.headers['x-tenant-id']
      : req.user.companyId;

    if (!targetCompanyId) return res.status(400).json({ message: 'No store selected' });

    const adminUser = await User.findOne({ userId: req.user.userId });
    const company   = await Company.findOne({ companyId: targetCompanyId });
    if (!company) return res.status(404).json({ message: 'Company not found' });

    const newUser = await User.create({
      companyId:     targetCompanyId,
      companyName:   company.companyName,
      companyUrl:    company.companyUrl || '',
      userName:      userName || '',
      email,
      password,
      plainPassword: password,
      phone:         adminUser?.phone || '',
      userType:      'user',
    });

    await Access.create({
      companyId:   targetCompanyId,
      companyName: company.companyName,
      userId:      newUser.userId,
      userType:    'user',
      status:      'active',
    });

    res.status(201).json({ message: 'User added successfully', userId: newUser.userId });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.removeUser = async (req, res) => {
  try {
    if (!['super_admin', 'store_admin'].includes(req.user.userType))
      return res.status(403).json({ message: 'Access denied' });

    const { userId } = req.params;
    if (userId === req.user.userId)
      return res.status(400).json({ message: 'Cannot remove yourself' });

    const user = await User.findOne({ userId, companyId: req.user.companyId });
    if (!user) return res.status(404).json({ message: 'User not found' });

    await User.deleteOne({ userId });
    await Access.deleteOne({ userId, companyId: req.user.companyId });

    res.json({ message: 'User removed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getUsersLog = async (req, res) => {
  try {
    const mainDb = mongoose.connection.useDb('eprice_main_admin_db');
    let query    = {};

    if (req.user.userType === 'super_admin') {
      const tenantId = req.headers['x-tenant-id'];
      if (!tenantId) return res.status(400).json({ message: 'No store selected' });
      query = { companyId: tenantId, userType: { $in: ['store_admin', 'user'] } };
    } else {
      query = { companyId: req.user.companyId, userType: 'user' };
    }

    const logs = await mainDb.collection('userlogs')
      .find(query)
      .sort({ loginAt: -1 })
      .limit(50)
      .toArray();

    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
