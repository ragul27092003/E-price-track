const mongoose = require('mongoose');
const crypto = require('crypto');
const { getAdminDb } = require('../../config/db');
const User    = require('../../models/User');
const Company = require('../../models/Company');
const Access  = require('../../models/Access');

// Same hashing scheme as models/User.js pre('save') hook — must match,
// since addUser writes directly to the collection and bypasses Mongoose hooks.
const sha1 = (str) => crypto.createHash('sha1').update('salt' + str).digest('hex');

// ─── GET /api/settings/profile ────────────────────────────────────────────────
exports.getProfile = async (req, res) => {
  try {
    const user_id = req.user.user_id;

    if (req.user.user_type === 'super_admin') {
      const tenantId   = req.headers['x-tenant-id'];
      const superAdmin = await User.findOne({ user_id }).select('email_address');

      if (tenantId) {
        const storeUser = await User.findOne({ cmpid: tenantId, user_type: 'store_admin' });
        const company   = await Company.findOne({ companyId: tenantId }).select('logoUrl companyName primaryColor');
        if (storeUser) return res.json({
          ...storeUser.toObject(),
          email_address: superAdmin?.email_address || '',
          logoUrl:       company?.logoUrl           || '',
          companyName:   company?.companyName        || tenantId,
          primaryColor:  company?.primaryColor        || '#1864ab',
        });
      }

      const admin   = await User.findOne({ user_id });
      const company = await Company.findOne({ companyId: admin?.cmpid }).select('logoUrl companyName primaryColor');
      return res.json({
        ...admin?.toObject(),
        logoUrl:      company?.logoUrl      || '',
        companyName:  company?.companyName  || admin?.cmpid || '',
        primaryColor: company?.primaryColor || '#1864ab',
      });
    }

    const user = await User.findOne({ user_id });
    if (!user) return res.status(404).json({ message: 'User not found' });
    const company = await Company.findOne({ companyId: user.cmpid }).select('logoUrl companyName primaryColor');
    res.json({
      ...user.toObject(),
      logoUrl:      company?.logoUrl      || '',
      companyName:  company?.companyName  || user.cmpid || '',
      primaryColor: company?.primaryColor || '#1864ab',
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── POST /api/settings/logo-upload  (multipart — uses uploadStoreLogo middleware) ──
// Uploads the file to Cloudinary, saves the returned URL to Company, returns the URL.
// This replaces the old base64 approach: no giant strings in MongoDB, logo persists
// across store switches because it's a stable Cloudinary URL keyed by cmpid.
exports.uploadStoreLogo = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No image file provided.' });

    const logoUrl = req.file.path; // Cloudinary URL set by multer-storage-cloudinary

    const cmpid = req.user.user_type === 'super_admin'
      ? req.headers['x-tenant-id']
      : req.user.cmpid;

    if (!cmpid) return res.status(400).json({ message: 'No store selected.' });

    await Company.findOneAndUpdate(
      { companyId: cmpid },
      { $set: { logoUrl } },
      { upsert: true }
    );

    res.json({ message: 'Logo updated successfully', logoUrl });
  } catch (error) {
    console.error('uploadStoreLogo error:', error);
    res.status(500).json({ message: error.message });
  }
};

// ─── PUT /api/settings/logo  (kept for any direct-URL updates) ───────────────
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

// ─── PUT /api/settings/color  (brand primary color, persisted per company) ───
exports.updateColor = async (req, res) => {
  try {
    const { primaryColor } = req.body;

    if (!primaryColor || !/^#[0-9A-Fa-f]{6}$/.test(primaryColor)) {
      return res.status(400).json({ message: 'A valid hex color is required (e.g. #1864ab)' });
    }

    const cmpid = req.user.user_type === 'super_admin'
      ? req.headers['x-tenant-id']
      : req.user.cmpid;

    if (!cmpid) return res.status(400).json({ message: 'No store selected' });

    await Company.findOneAndUpdate(
      { companyId: cmpid },
      { $set: { primaryColor } },
      { upsert: true }
    );

    res.json({ message: 'Color updated successfully', primaryColor });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── PUT /api/settings/profile ────────────────────────────────────────────────
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

// ─── PUT /api/settings/password ───────────────────────────────────────────────
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
    user.password     = newPassword;
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── GET /api/settings/users ──────────────────────────────────────────────────
exports.getUsers = async (req, res) => {
  try {
    const cmpid = req.user.user_type === 'super_admin'
      ? req.headers['x-tenant-id']
      : req.user.cmpid;

    if (!cmpid) return res.status(400).json({ message: 'Company ID is required' });

    const adminDb = getAdminDb('plm_admin_manage_info');
    const users = await adminDb
      .collection('plm_admin_users')
      .find({ cmpid, user_type: 'user', user_id: { $ne: req.user.user_id } })
      .project({ password: 0, password_new: 0, password_code: 0 })
      .toArray();

    res.json(users);
  } catch (error) {
    console.error('getUsers error:', error);
    res.status(500).json({ message: error.message });
  }
};

// ─── POST /api/settings/add-user ─────────────────────────────────────────────
exports.addUser = async (req, res) => {
  try {
    if (!['super_admin', 'store_admin'].includes(req.user.user_type))
      return res.status(403).json({ message: 'Access denied' });

    const { email_address, password, user_name, email_notify, export_option } = req.body;
    if (!email_address || !password)
      return res.status(400).json({ message: 'Email and password are required' });

    const targetCmpid = req.user.user_type === 'super_admin'
      ? req.headers['x-tenant-id']
      : req.user.cmpid;

    if (!targetCmpid) return res.status(400).json({ message: 'No store selected' });

    const adminDb = getAdminDb('plm_admin_manage_info');

    const exists = await adminDb.collection('plm_admin_users').findOne({ email_address });
    if (exists) return res.status(400).json({ message: 'Email already registered' });

    const adminUser = await adminDb.collection('plm_admin_users').findOne({ user_id: req.user.user_id });

    const user_id = require('crypto').randomBytes(16).toString('hex');
    const password_code = require('crypto').randomBytes(8).toString('hex');
    const now     = new Date();

    await adminDb.collection('plm_admin_users').insertOne({
      user_id,
      cmpid:         targetCmpid,
      website:       adminUser?.website || '',
      user_name:     user_name || '',
      email_address,
      password:      sha1(password),
      password_new:  password,
      password_code,
      mobile_number: adminUser?.mobile_number || '',
      user_type:     'user',
      email_notify:  email_notify === 'yes' ? 'yes' : 'no',
      export_option: export_option === 'yes' ? 'yes' : 'no',
      page_option:   null,
      login_cookie:  '',
      last_login:    '',
      addedby:       req.user.user_id,
      addedon:       now,
      archived:      0,
     
    });

     
    

    await Access.create({
      cmpid:     targetCmpid,
      user_id,
      user_type: 'user',
      user_name: user_name || email_address,
      addedby:   req.user.user_id,
    });

    res.status(201).json({ message: 'User added successfully', user_id });
  } catch (error) {
    console.error('addUser error:', error);
    res.status(500).json({ message: error.message });
  }
};

// ─── DELETE /api/settings/users/:user_id ─────────────────────────────────────
exports.removeUser = async (req, res) => {
  try {
    if (!['super_admin', 'store_admin'].includes(req.user.user_type))
      return res.status(403).json({ message: 'Access denied' });

    const { user_id } = req.params;
    if (user_id === req.user.user_id)
      return res.status(400).json({ message: 'Cannot remove yourself' });

    const cmpid = req.user.user_type === 'super_admin'
      ? req.headers['x-tenant-id']
      : req.user.cmpid;

    const adminDb = getAdminDb('plm_admin_manage_info');

    const user = await adminDb.collection('plm_admin_users').findOne({ user_id, cmpid });
    if (!user) return res.status(404).json({ message: 'User not found' });

    await adminDb.collection('plm_admin_users').deleteOne({ user_id });

    res.json({ message: 'User removed successfully' });
  } catch (error) {
    console.error('removeUser error:', error);
    res.status(500).json({ message: error.message });
  }
};

// ─── GET /api/settings/log-users ─────────────────────────────────────────────
// Returns the tenant's users (store_admin + user) for the "Manage Log History"
// filter dropdown — id/name/email only.
exports.getLogFilterUsers = async (req, res) => {
  try {
    const adminDb = mongoose.connection.db;

    let userFilter = {};
    if (req.user.user_type === 'super_admin') {
      const tenantId = req.headers['x-tenant-id'];
      if (!tenantId) return res.status(400).json({ message: 'No store selected' });
      userFilter = { cmpid: tenantId, user_type: { $in: ['store_admin', 'user'] } };
    } else {
      userFilter = { cmpid: req.user.cmpid, user_type: { $in: ['store_admin', 'user'] } };
    }

    const users = await adminDb
      .collection('plm_admin_users')
      .find(userFilter)
      .project({ user_id: 1, user_name: 1, email_address: 1, user_type: 1 })
      .toArray();

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── GET /api/settings/users-log ─────────────────────────────────────────────
// Query params (all optional):
//   user_id  - filter to a single user (defaults to all users of the tenant)
//   start    - 'YYYY-MM-DD', inclusive
//   end      - 'YYYY-MM-DD', inclusive
// plm_user_history_logs does NOT store cmpid — it only has
// user_id/user_name/user_type/email_address/log_at/system_log/data_log.
// So we resolve which user_ids belong to this tenant from plm_admin_users
// first, then filter the logs by those user_ids.
exports.getUsersLog = async (req, res) => {
  try {
    const adminDb = mongoose.connection.db; // plm_admin_manage_info
    const { user_id, start, end } = req.query;
    const page  = Math.max(parseInt(req.query.page, 10)  || 1, 1);
    const limit = Math.max(parseInt(req.query.limit, 10) || 20, 1);

    let userFilter = {};
    if (req.user.user_type === 'super_admin') {
      const tenantId = req.headers['x-tenant-id'];
      if (!tenantId) return res.status(400).json({ message: 'No store selected' });
      userFilter = { cmpid: tenantId, user_type: { $in: ['store_admin', 'user'] } };
    } else {
      userFilter = { cmpid: req.user.cmpid, user_type: 'user' };
    }

    const tenantUsers = await adminDb
      .collection('plm_admin_users')
      .find(userFilter)
      .project({ user_id: 1 })
      .toArray();

    let userIds = tenantUsers.map((u) => u.user_id);
    if (userIds.length === 0) return res.json({ total: 0, page, limit, logs: [] });

    // Narrow to a single user if requested (must still belong to the tenant).
    if (user_id && user_id !== 'all') {
      if (!userIds.includes(user_id)) return res.json({ total: 0, page, limit, logs: [] });
      userIds = [user_id];
    }

    const logs = await adminDb
      .collection('plm_user_history_logs')
      .find({ user_id: { $in: userIds } })
      .sort({ _id: -1 })
      .limit(2000)
      .toArray();

    // log_at is a formatted string like "2026-07-07 01:31:40pm" (not a real
    // Date on most docs), but it's zero-padded ISO at the front, so a plain
    // string prefix compare against 'YYYY-MM-DD' works for range filtering.
    let filtered = logs;
    if (start || end) {
      filtered = logs.filter((l) => {
        const datePart = (l.log_at || '').slice(0, 10);
        if (!datePart) return false;
        if (start && datePart < start) return false;
        if (end && datePart > end) return false;
        return true;
      });
    }

    const total = filtered.length;
    const startIdx = (page - 1) * limit;
    const pageLogs = filtered.slice(startIdx, startIdx + limit);

    res.json({ total, page, limit, logs: pageLogs });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};