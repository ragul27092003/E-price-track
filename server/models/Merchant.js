const mongoose = require('mongoose');

const feedInfoSchema = new mongoose.Schema({
  feed_name:           { type: String, default: '' },
  feed_url:            { type: String, default: '' },
  feed_type:           { type: String, enum: ['json', 'Json', 'shopify', 'wordpress'], default: 'json' },
  schedule_info:       { type: String, enum: ['Daily', 'Hourly', 'Weekly', 'Monthly'], default: 'Daily' },
  import_time:         { type: String, default: '06:00' },
  cms_upload_type:     { type: String, enum: ['none', 'shopify', 'wordpress'], default: 'none' },
  shopify_name:        { type: String, default: '' },
  shopify_accesstoken: { type: String, default: '' },
}, { _id: false });

const merchantSchema = new mongoose.Schema({
  companyId: { type: String, required: true, unique: true },
  userId:    { type: String, required: true },
  status:    { type: String, enum: ['active', 'inactive'], default: 'active' },
  feed_info: { type: feedInfoSchema },
}, { timestamps: true, collection: 'merchants' });

module.exports = mongoose.model('Merchant', merchantSchema);
