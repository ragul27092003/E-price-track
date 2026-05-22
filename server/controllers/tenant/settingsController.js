const mongoose = require('mongoose');
const { getAdminDb } = require('../../config/db');
const User = require('../../models/User');
const Access = require('../../models/Access');
const Company = require('../../models/Company');

exports.getProfile = async (req, res) => {
  try {
    const user_id = req.user.user_id;

    if (req.user.user_type === 'super_admin') {
      const tenantId   = req.headers['x-tenant-id'];
      const superAdmin = await User.findOne({ user_id }).select('email_address');

      if (tenantId) {
        const storeUser = await User.findOne({ cmpid: tenantId, user_type: 'store_admin' });
        const company   = await Company.findOne({ companyId: tenantId }).select('logoUrl companyName');
        if (storeUser) return res.json({
          ...storeUser.toObject(),
          email_address: superAdmin?.email_address  || '',
          logoUrl:       company?.logoUrl            || '',
          companyName:   company?.companyName        || tenantId,
        });
      }

      const admin   = await User.findOne({ user_id });
      const company = await Company.findOne({ companyId: admin?.cmpid }).select('logoUrl companyName');
      return res.json({
        ...admin?.toObject(),
        logoUrl:     company?.logoUrl     || '',
        companyName: company?.companyName || admin?.cmpid || '',
      });
    }

    const user    = await User.findOne({ user_id });
    if (!user) return res.status(404).json({ message: 'User not found' });
    const company = await Company.findOne({ companyId: user.cmpid }).select('logoUrl companyName');
    res.json({
      ...user.toObject(),
      logoUrl:     company?.logoUrl     || '',
      companyName: company?.companyName || user.cmpid || '',
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateLogo = async (req, res) => {
  try {
    const { logoUrl } = req.body;

    const cmpid = req.user.user_type === 'super_admin'
      ? req.headers['x-tenant-id']
      : req.user.cmpid;

    if (!cmpid) return res.status(400).json({ message: 'No store selected' });

    await Company.findOneAndUpdate(
      { companyId: cmpid },
      { $set: { logoUrl: logoUrl || '' } }
    );

    res.json({ message: 'Logo updated successfully', logoUrl: logoUrl || '' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { mobile_number } = req.body;
    const now = new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, '');
    await User.findOneAndUpdate(
      { user_id: req.user.user_id },
      { $set: { mobile_number, modifiedon: now } }
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

    let user_id = req.user.user_id;

    if (req.user.user_type === 'super_admin') {
      const tenantId = req.headers['x-tenant-id'];
      if (tenantId) {
        const storeUser = await User.findOne({ cmpid: tenantId, user_type: 'store_admin' });
        if (storeUser) user_id = storeUser.user_id;
      }
    }

    const user = await User.findOne({ user_id });
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.password_new = newPassword;
    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const cmpid = req.user.user_type === 'super_admin'
      ? req.headers['x-tenant-id']
      : req.user.cmpid;

    if (!cmpid) return res.status(400).json({ message: 'Company ID is required' });

    const company = await Company.findOne({ companyId: cmpid });
    if (!company) return res.status(404).json({ message: 'Store not found' });

    const users = await User.find({
      cmpid,
      user_type: 'user',
      user_id:   { $ne: req.user.user_id },
    }).select('-password');

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.addUser = async (req, res) => {
  try {
    if (!['super_admin', 'store_admin'].includes(req.user.user_type))
      return res.status(403).json({ message: 'Access denied' });

    const { email_address, password, user_name } = req.body;
    if (!email_address || !password)
      return res.status(400).json({ message: 'Email and password are required' });

    const exists = await User.findOne({ email_address });
    if (exists) return res.status(400).json({ message: 'Email already registered' });

    const targetCmpid = req.user.user_type === 'super_admin'
      ? req.headers['x-tenant-id']
      : req.user.cmpid;

    if (!targetCmpid) return res.status(400).json({ message: 'No store selected' });

    const adminUser = await User.findOne({ user_id: req.user.user_id });
    const company   = await Company.findOne({ companyId: targetCmpid });
    if (!company) return res.status(404).json({ message: 'Company not found' });

    const newUser = await User.create({
      cmpid:         targetCmpid,
      website:       company.companyUrl || '',
      user_name:     user_name || '',
      email_address,
      password,
      password_new:  password,
      mobile_number: adminUser?.mobile_number || '',
      user_type:     'user',
      addedby:       req.user.user_id,
    });

    await Access.create({
      cmpid:     targetCmpid,
      user_id:   newUser.user_id,
      user_type: 'user',
      user_name: user_name || '',
      addedby:   req.user.user_id,
    });

    res.status(201).json({ message: 'User added successfully', user_id: newUser.user_id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.removeUser = async (req, res) => {
  try {
    if (!['super_admin', 'store_admin'].includes(req.user.user_type))
      return res.status(403).json({ message: 'Access denied' });

    const { user_id } = req.params;
    if (user_id === req.user.user_id)
      return res.status(400).json({ message: 'Cannot remove yourself' });

    const user = await User.findOne({ user_id, cmpid: req.user.cmpid });
    if (!user) return res.status(404).json({ message: 'User not found' });

    await User.deleteOne({ user_id });
    await Access.deleteOne({ user_id, cmpid: req.user.cmpid });

    res.json({ message: 'User removed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getUsersLog = async (req, res) => {
  try {
    const mainDb = getAdminDb('eprice_main_admin_db');
    let query    = {};

    if (req.user.user_type === 'super_admin') {
      const tenantId = req.headers['x-tenant-id'];
      if (!tenantId) return res.status(400).json({ message: 'No store selected' });
      query = { cmpid: tenantId, user_type: { $in: ['store_admin', 'user'] } };
    } else {
      query = { cmpid: req.user.cmpid, user_type: 'user' };
    }

    const logs = await mainDb.collection('plm_user_history_logs')
      .find(query)
      .sort({ _id: -1 })
      .limit(50)
      .toArray();

    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
