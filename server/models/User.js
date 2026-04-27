const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const generateUserId = () => `usr_${crypto.randomBytes(8).toString('hex')}`;

const userSchema = new mongoose.Schema({
  userId:     { type: String, unique: true, default: generateUserId },
  companyId:  { type: String, required: true },
  companyUrl: { type: String, default: '' },
  companyName: { type: String, default: '' },
  userName:    { type: String },   
  email:      { type: String, required: true, unique: true, lowercase: true },
  password:   { type: String, required: true },
  phone:      { type: String, default: '' },
  userType:   { type: String, enum: ['super_admin', 'store_admin','user'], default: 'store_admin' },
}, { timestamps: true, collection: 'users' });

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
}); 

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);