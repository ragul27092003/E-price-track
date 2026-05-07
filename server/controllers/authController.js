const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Company = require('../models/Company');
const Merchant = require('../models/Merchant');
const Access = require('../models/Access');
const { getTenantDb } = require('../config/db');

const generateToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

exports.login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: 'Email and password are required' });

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    const access = await Access.findOne({
      userId:    user.userId,
      companyId: user.companyId,
      status:    'active',
    });
    if (!access)
      return res.status(401).json({ message: 'Access denied. Please contact admin.' });

    const merchant = await Merchant.findOne({ companyId: user.companyId });
    const company  = await Company.findOne({ companyId: user.companyId });

    const token = generateToken({
      id:        user._id,
      userId:    user.userId,
      userType:  user.userType,
      companyId: user.companyId,
    });

    const mainDb = mongoose.connection.useDb('eprice_main_admin_db');
    await mainDb.collection('userlogs').insertOne({
      userId:    user.userId,
      email:     user.email,
      userType:  user.userType,
      companyId: user.companyId,
      action:    'login',
      loginAt:   new Date(),
      ip:        req.ip || req.headers['x-forwarded-for'] || '',
    });

    res.json({
      token,
      userId:      user.userId,
      userType:    user.userType,
      companyId:   user.companyId,
      companyName: company?.companyName  || '',
      companyUrl:  user.companyUrl       || '',
      email:       user.email,
      shopName:    merchant?.feed_info?.feed_name || '',
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.checkEmail = async (req, res) => {
  const { email } = req.query;
  if (!email) return res.json({ exists: false });
  const user = await User.findOne({ email: email.toLowerCase() });
  res.json({ exists: !!user });
};

exports.checkCompanyName = async (req, res) => {
  const { companyName } = req.query;
  if (!companyName) return res.json({ exists: false });
  const company = await Company.findOne({
    companyId: companyName.toLowerCase().trim()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, ''),
  });
  res.json({ exists: !!company });
};

exports.signup = async (req, res) => {
  const { companyName, companyUrl, email, password, phone } = req.body;
  if (!companyName || !companyUrl || !email || !password)
    return res.status(400).json({ message: 'companyName, companyUrl, email and password are required' });

  try {
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Email already registered' });

    const company = await Company.create({ companyName, companyUrl, status: 'active' });

    const user = await User.create({
      companyId:   company.companyId,
      companyName,
      companyUrl,
      email,
      password,
      phone:    phone || '',
      userType: 'store_admin',
    });

    const merchant = await Merchant.create({
      companyId: company.companyId,
      userId:    user.userId,
      status:    'active',
    });

    await Access.create({
      companyId:   company.companyId,
      userId:      user.userId,
      userType:    'store_admin',
      companyName,
      status:      'active',
    });

    const tenantDb = getTenantDb(company.companyId);
    await tenantDb.collection('settings').insertOne({
      companyId:   company.companyId,
      companyName,
      companyUrl,
      userId:      user.userId,
      merchantId:  merchant._id,
      status:      'active',
      createdAt:   new Date(),
    });

    res.status(201).json({
      message:     'Store created successfully',
      companyId:   company.companyId,
      companyName,
      userId:      user.userId,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.seedSuperAdmin = async (req, res) => {
  try {
    const exists = await User.findOne({ userType: 'super_admin' });
    if (exists) return res.status(400).json({ message: 'Super admin already exists' });

    const { companyUrl, email, password } = req.body;
    if (!companyUrl || !email || !password)
      return res.status(400).json({ message: 'companyUrl, email and password are required' });

    const company = await Company.create({ companyName: 'GMC Admin', status: 'active' });

    const admin = await User.create({
      companyId:  company.companyId,
      companyUrl,
      email,
      password,
      userType: 'super_admin',
    });

    await Access.create({
      companyId: company.companyId,
      userId:    admin.userId,
      userType:  'super_admin',
      userName:  companyUrl,
      status:    'active',
    });

    res.status(201).json({ message: 'Super admin created', userId: admin.userId });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAllStores = async (req, res) => {
  try {
    const merchants = await Merchant.find({ status: 'active' });

    const stores = await Promise.all(
      merchants.map(async (merchant) => {
        const user    = await User.findOne({ userId: merchant.userId }).select('-password');
        const company = await Company.findOne({ companyId: merchant.companyId });
        return {
          _id:         merchant._id,
          companyId:   merchant.companyId,
          companyName: company?.companyName || '',
          companyUrl:  user?.companyUrl     || '',
          userId:      merchant.userId,
          status:      merchant.status,
        };
      })
    );

    res.json(stores);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getMerchant = async (req, res) => {
  const { companyId } = req.params;
  try {
    const merchant = await Merchant.findOne({ companyId });
    if (!merchant) return res.status(404).json({ message: 'Merchant not found' });
    res.json(merchant);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
