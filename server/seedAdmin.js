require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const generateCompanyId = () => `CMP_${crypto.randomBytes(6).toString('hex')}`;
const generateUserId    = () => `usr_${crypto.randomBytes(8).toString('hex')}`;

async function seedAdmin() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const mainDb = mongoose.connection.useDb('eprice_main_admin_db');

  // Check if super admin already exists in users collection
  const exists = await mainDb.collection('users').findOne({ userType: 'super_admin' });
  if (exists) {
    console.log('Super admin already exists:', exists.email);
    process.exit(0);
  }

  const hashedPassword = await bcrypt.hash('Hack@123', 10);
  const companyId      = generateCompanyId();
  const userId         = generateUserId();

  // Step 1: Insert into companies collection
  await mainDb.collection('companies').insertOne({
    companyId:   companyId,
    companyName: 'GMC Admin',
    status:      'active',
    createdAt:   new Date(),
    updatedAt:   new Date(),
  });
  console.log('✔ Company created');

  // Step 2: Insert into users collection
  await mainDb.collection('users').insertOne({
    userId:    userId,
    companyId: companyId,
    name:      'Super Admin',
    email:     'superadmin@gmail.com',
    password:  hashedPassword,
    phone:     '',
    userType:  'super_admin',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  console.log('✔ User created');

  // Step 3: Insert into accesses collection
  await mainDb.collection('accesses').insertOne({
    companyId: companyId,
    userId:    userId,
    userType:  'super_admin',
    userName:  'Super Admin',
    status:    'active',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  console.log('✔ Access created');

  console.log('\n Super admin created successfully!');
  console.log('Email:    superadmin@gmail.com');
  console.log('Password: Hack@123');
  process.exit(0);
}

seedAdmin().catch((err) => {
  console.error(err);
  process.exit(1);
}); 