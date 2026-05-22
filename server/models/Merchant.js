const mongoose = require('mongoose');

const feedInfoSchema = new mongoose.Schema({
  store_name:          { type: String, default: '' },
  feed_type:           { type: String, default: 'json' },
  feed_url:            { type: String, default: '' },
  schedule_info:       { type: String, enum: ['daily', 'Daily', 'Hourly', 'Weekly', 'Monthly'], default: 'daily' },
  import_time:         { type: String, default: '12:00 PM' },
  shopify_name:        { type: String, default: '' },
  shopify_accesstoken: { type: String, default: '' },
  cms_upload_type:     { type: String, enum: ['none', 'shopify', 'wordpress'], default: 'none' },
}, { _id: false });

const merchantSchema = new mongoose.Schema({
  cmpid:               { type: String, required: true, unique: true },
  userid:              { type: String, required: true },
  access_keys:         { type: String, default: '' },
  secret_keys:         { type: String, default: '' },
  scrap_schedule:      { type: String, default: 'daily' },
  scrap_time:          { type: String, default: '' },
  timezone:            { type: String, default: 'Asia/Kolkata' },
  is_cmp_feild_done:   { type: String, default: 'active' },
  is_db:               { type: String, default: 'yes' },
  archived:            { type: Number, default: 0 },
  cron_server_id:      { type: Number, default: 1 },
  logo:                { type: String, default: '' },
  account_type:        { type: String, default: 'live_account' },
  addedon:             { type: Date, default: Date.now },
  payment:             { type: String, default: 'yes' },
  feed_info:           { type: feedInfoSchema },
}, { collection: 'plm_admin_cmp_merchant_accounts' });

module.exports = mongoose.model('plm_admin_cmp_merchant_accounts', merchantSchema);
