const mongoose = require('mongoose');
const crypto   = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Company = require('../models/Company');
const Merchant = require('../models/Merchant');
const Access = require('../models/Access');
const { getTenantDb, getAdminDb } = require('../config/db');

const generateToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

function formatLogTime(date) {
  const d = date || new Date();
  const year  = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day   = String(d.getDate()).padStart(2, '0');
  let   hours = d.getHours();
  const mins  = String(d.getMinutes()).padStart(2, '0');
  const secs  = String(d.getSeconds()).padStart(2, '0');
  const ampm  = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12 || 12;
  return `${year}-${month}-${day} ${String(hours).padStart(2, '0')}:${mins}:${secs}${ampm}`;
}

function parseUA(ua = '') {
  const s = ua.toLowerCase();
  let device  = 'desktop';
  let browser = 'Unknown';
  if (/mobile|android|iphone/.test(s))       device = 'mobile';
  else if (/tablet|ipad/.test(s))             device = 'tablet';
  if      (/edg\//.test(s))                  browser = 'Edge';
  else if (/opr\/|opera/.test(s))             browser = 'Opera';
  else if (/firefox/.test(s))                browser = 'Firefox';
  else if (/chrome/.test(s))                 browser = 'Chrome';
  else if (/safari/.test(s))                 browser = 'Safari';
  return { device, browser };
}

exports.login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: 'Email and password are required' });

  try {
    console.log('Login attempt for email:', email);
    const user = await User.findOne({ email_address: email });
    // const user = await User.find({})
    // console.log('all datas', user);
    if (!user) return res.status(401).json({ message: 'Invalid credentials1' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    const access = await Access.findOne({
      user_id:  user.user_id,
      cmpid:    user.cmpid,
      archived: 0,
    });
    if (!access)
      return res.status(401).json({ message: 'Access denied. Please contact admin.' });

    const merchant = await Merchant.findOne({ cmpid: user.cmpid });
    const company  = await Company.findOne({ companyId: user.cmpid });

    const token = generateToken({
      id:        user._id,
      user_id:   user.user_id,
      user_type: user.user_type,
      cmpid:     user.cmpid,
    });
    const now = new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, '');
    User.findOneAndUpdate(
      { user_id: user.user_id },
      { $set: { last_login: now } }
    ).catch(() => {});

    res.json({
      token,
      user_id:       user.user_id,
      user_type:     user.user_type,
      cmpid:         user.cmpid,
      companyName:   company?.companyName || '',
      website:       user.website         || '',
      email_address: user.email_address,
      shopName:      merchant?.feed_info?.store_name || '',
      export_type:   merchant?.export_type ?? 'A',
      show_lsp:      merchant?.show_lsp    ?? false,
    });

    const { device, browser } = parseUA(req.headers['user-agent']);
    getAdminDb('eprice_main_admin_db')
      .collection('plm_user_history_logs')
      .insertOne({
        usersess_id:   crypto.randomBytes(16).toString('base64url').slice(0, 26),
        user_id:       user.user_id,
        user_name:     user.user_name || user.email_address,
        user_type:     user.user_type,
        email_address: user.email_address,
        cmpid:         user.cmpid,
        action:        'manual_login',
        log_at:        formatLogTime(new Date()),
        system_log: {
          ip_addr: req.ip || req.headers['x-forwarded-for'] || '',
          device,
          browser,
        },
        data_log: {
          pageurl: '/login',
          action:  'manual_login',
          query:   null,
        },
      })
      .catch((err) => console.error('Login log failed:', err.message));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.checkEmail = async (req, res) => {
  const { email } = req.query;
  if (!email) return res.json({ exists: false });
  const user = await User.findOne({ email_address: email.toLowerCase() });
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
    const exists = await User.findOne({ email_address: email });
    if (exists) return res.status(400).json({ message: 'Email already registered' });

    const company = await Company.create({ companyName, companyUrl, status: 'active' });

    const user = await User.create({
      cmpid:         company.companyId,
      website:       companyUrl,
      email_address: email,
      password,
      password_new:  password,
      mobile_number: phone || '',
      user_type:     'store_admin',
      addedby:       '',
    });

    const merchant = await Merchant.create({
      cmpid:   company.companyId,
      userid:  user.user_id,
    });

    await Access.create({
      cmpid:     company.companyId,
      user_id:   user.user_id,
      user_type: 'store_admin',
      user_name: companyName,
      addedby:   user.user_id,
    });

    const tenantDb = getTenantDb(company.companyId);
    await tenantDb.collection('settings').insertOne({
      companyId:   company.companyId,
      companyName,
      companyUrl,
      user_id:     user.user_id,
      merchantId:  merchant._id,
      status:      'active',
      createdAt:   new Date(),
    });

    res.status(201).json({
      message:     'Store created successfully',
      cmpid:       company.companyId,
      companyName,
      user_id:     user.user_id,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.seedSuperAdmin = async (req, res) => {
  try {
    const exists = await User.findOne({ user_type: 'super_admin' });
    if (exists) return res.status(400).json({ message: 'Super admin already exists' });

    const { companyUrl, email, password } = req.body;
    if (!companyUrl || !email || !password)
      return res.status(400).json({ message: 'companyUrl, email and password are required' });

    const company = await Company.create({ companyName: 'GMC Admin', status: 'active' });

    const admin = await User.create({
      cmpid:         company.companyId,
      website:       companyUrl,
      email_address: email,
      password,
      password_new:  password,
      user_type:     'super_admin',
    });

    await Access.create({
      cmpid:     company.companyId,
      user_id:   admin.user_id,
      user_type: 'super_admin',
      user_name: companyUrl,
      addedby:   admin.user_id,
    });

    res.status(201).json({ message: 'Super admin created', user_id: admin.user_id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAllStores = async (req, res) => {
  try {
    // const cmpDbsSetup = require('../configs/cmpDbsSetup');

    // Stores from the main DB (Node.js registered stores)
    const merchants = await Merchant.find({ archived: 0 });
    const dbStores  = await Promise.all(
      merchants.map(async (merchant) => {
        const user    = await User.findOne({ user_id: merchant.userid }).select('-password');
        const company = await Company.findOne({ companyId: merchant.cmpid });
        return {
          _id:         merchant._id,
          companyId:   merchant.cmpid,
          companyName: company?.companyName || merchant.cmpid,
          website:     user?.website        || '',
          user_id:     merchant.userid,
          archived:    merchant.archived,
        };
      })
    );

    // Supplement with cmpDbsSetup entries not already in the DB list
    // const dbCmpIds    = new Set(dbStores.map((s) => s.companyId));
    // const configStores = Object.keys(cmpDbsSetup)
    //   .filter((cmpId) => !dbCmpIds.has(cmpId))
    //   .map((cmpId) => ({
    //     _id:         cmpId,
    //     companyId:   cmpId,
    //     companyName: cmpId.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    //     website:     '',
    //     user_id:     '',
    //     archived:    0,
    //   }));

    res.json([...dbStores]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getMerchant = async (req, res) => {
  const { companyId } = req.params;
  try {
    const merchant = await Merchant.findOne({ cmpid: companyId });
    if (!merchant) return res.status(404).json({ message: 'Merchant not found' });
    res.json(merchant);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
