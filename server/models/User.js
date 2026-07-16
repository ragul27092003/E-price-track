const mongoose = require('mongoose');
const crypto = require('crypto');

const sha1 = (str) => crypto.createHash('sha1').update('salt' + str).digest('hex');

const generateUserId = () => crypto.randomBytes(16).toString('hex');

const userSchema = new mongoose.Schema({
  user_id:                  { type: String, unique: true, default: generateUserId },
  cmpid:                    { type: String, required: true },
  website:                  { type: String, default: '' },
  email_address:            { type: String, required: true, unique: true, lowercase: true },
  password:                 { type: String, required: true },
  password_code:            { type: String, default: '' },
  mobile_number:            { type: String, default: '' },
  user_type:                { type: String, enum: ['super_admin', 'store_admin', 'user'], default: 'store_admin' },
  user_name:                { type: String, default: '' },
  email_notify:             { type: String, default: 'yes' },
  export_option:            { type: String, default: 'yes' },
  webprice_access:          { type: String, default: 'no' },
  addedby:                  { type: String, default: '' },
  addedon:                  { type: Date, default: Date.now },
  archived:                 { type: Number, default: 0 },
  account_type:             { type: String, default: 'live_account' },
  last_login:               { type: String, default: '' },
  password_new:             { type: String, default: '' },
  login_cookie:             { type: String, default: '' },
  modifiedon:               { type: String, default: '' },
  profile_picture_location: { type: String, default: '' },
  reset_otp_hash:           { type: String, default: '' },
  reset_otp_expires_at:     { type: Date },
  reset_otp_attempts:       { type: Number, default: 0 },
}, { collection: 'plm_admin_users' });

userSchema.pre('save', function () {
  if (!this.isModified('password')) return;
  this.password = sha1(this.password);
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  console.log('Comparing password for user:',sha1(candidatePassword), this.password);
  return sha1(candidatePassword) === this.password;
};

module.exports = mongoose.model('plm_admin_users', userSchema);
