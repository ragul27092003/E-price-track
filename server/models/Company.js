const mongoose = require('mongoose');

const slugify = (name) =>
  name.toLowerCase().trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');

const companySchema = new mongoose.Schema({
  companyId:    { type: String, unique: true },
  companyName:  { type: String, required: true },
  companyUrl:   { type: String, default: '' },
  logoUrl:      { type: String, default: '' },
  primaryColor: { type: String, default: '#1864ab' },
  status: { type: String, enum: ['pending_provision', 'active', 'inactive'], default: 'pending_provision' },
  provisionedAt: { type: Date, default: null },
  provisionedBy: { type: String, default: null },
}, { timestamps: true, collection: 'companies' });

companySchema.pre('save', async function () {
  if (!this.companyId) {
    const baseId = slugify(this.companyName);

    let companyId = baseId;
    let counter = 1;
    while (await mongoose.model('Company').findOne({ companyId })) {
      companyId = `${baseId}_${counter}`;
      counter++;
    }
    this.companyId = companyId;
  }
});

module.exports = mongoose.model('Company', companySchema);
