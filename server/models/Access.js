const mongoose = require('mongoose');

const accessSchema = new mongoose.Schema({
  cmpid:     { type: String, required: true },
  user_name: { type: String, default: '' },
  user_id:   { type: String, required: true },
  user_type: { type: String, enum: ['super_admin', 'store_admin', 'user'], required: true },
  addedby:   { type: String, default: '' },
  addedon:   { type: Date, default: Date.now },
  archived:  { type: Number, default: 0 },
}, { collection: 'plm_admin_user_company_access' });

module.exports = mongoose.model('plm_admin_user_company_access', accessSchema);
