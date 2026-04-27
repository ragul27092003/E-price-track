const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Company = require('../models/Company');
const Merchant = require('../models/Merchant');
const Access = require('../models/Access');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const { getTenantDb } = require('../config/db');

const router = express.Router();

const generateToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: 'Email and password are required' });

  try {
    // Step 1: Find user by email
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    // Step 2: Compare password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    // Step 3: Check access — companyId match + active status
    const access = await Access.findOne({
      userId:    user.userId,
      companyId: user.companyId,
      status:    'active',
    });
    if (!access) {
      return res.status(401).json({ message: 'Access denied. Please contact admin.' });
    }

    // Step 4: Get merchant + company info
    const merchant = await Merchant.findOne({ companyId: user.companyId });
    const company  = await Company.findOne({ companyId: user.companyId });

    // Step 5: Create JWT token
    const token = generateToken({
      id:        user._id,
      userId:    user.userId,
      userType:  user.userType,
      companyId: user.companyId,
    });

    // Step 6: Save login log to main DB
    const mainDb = mongoose.connection.useDb('gmc_main_admin_db');
    await mainDb.collection('userlogs').insertOne({
      userId:    user.userId,
      email:     user.email,
      userType:  user.userType,
      companyId: user.companyId,
      action:    'login',
      loginAt:   new Date(),
      ip:        req.ip || req.headers['x-forwarded-for'] || '',
    });

    // Step 7: Send response
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
});

// GET /api/auth/check-email
router.get('/check-email', async (req, res) => {
  const { email } = req.query;
  if (!email) return res.json({ exists: false });
  const user = await User.findOne({ email: email.toLowerCase() });
  res.json({ exists: !!user });
});

// GET /api/auth/check-companyname
router.get('/check-companyname', async (req, res) => {
  const { companyName } = req.query;
  if (!companyName) return res.json({ exists: false });
  const company = await Company.findOne({
    companyId: companyName.toLowerCase().trim()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '')
  });
  res.json({ exists: !!company });
});

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  const { companyName, companyUrl, email, password, phone } = req.body;
  if (!companyName || !companyUrl || !email || !password)
    return res.status(400).json({ message: 'companyName, companyUrl, email and password are required' });

  try {
    // Step 1: Check email already exists
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Email already registered' });

    // Step 2: Create company — companyId auto slugified from companyName
    const company = await Company.create({
      companyName,
      companyUrl,
      status: 'active',
    });

    // Step 3: Create user
    const user = await User.create({
      companyId:  company.companyId,
      companyName: companyName,
      companyUrl,
      email,
      password,
      phone:    phone || '',
      userType: 'store_admin',
    });

    // Step 4: Create merchant
    const merchant = await Merchant.create({
      companyId: company.companyId,
      userId:    user.userId,
      status:    'active',
    });

    // Step 5: Create access record
    await Access.create({
      companyId: company.companyId,
      userId:    user.userId,
      userType:  'store_admin',
      companyName: companyName,
      status:    'active',
    });

    // Step 6: Provision tenant DB
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
});

// POST /api/auth/seed-super-admin
router.post('/seed-super-admin', async (req, res) => {
  try {
    const exists = await User.findOne({ userType: 'super_admin' });
    if (exists) return res.status(400).json({ message: 'Super admin already exists' });

    const { companyUrl, email, password } = req.body;
    if (!companyUrl || !email || !password)
      return res.status(400).json({ message: 'companyUrl, email and password are required' });

    // Create company for super admin
    const company = await Company.create({
      companyName: 'GMC Admin',
      status:      'active',
    });

    // Create super admin user
    const admin = await User.create({
      companyId:  company.companyId,
      companyUrl,
      email,
      password,
      userType: 'super_admin',
    });

    // Create access record
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
});

// GET /api/auth/all-stores (super_admin only)
router.get('/all-stores', auth, roleCheck('super_admin'), async (req, res) => {
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
});

module.exports = router;