/**
 * Run ONCE to grant plm_admin readWrite access on all tenant databases.
 * Uses divAdmin (root) which has userAdminAnyDatabase rights.
 * Usage:  node grantTenantAccess.js
 */
require('dotenv').config();
const { MongoClient } = require('mongodb');

const ADMIN_URI = process.env.TENANT_MONGO_URI; // divAdmin with authSource=admin
const PLM_USER  = 'plm_admin';

// All tenant databases follow the plm_user_info_* naming convention from config.php
const cmpDbsSetup = require('./configs/cmpDbsSetup');
const TENANT_DBS = [
  ...new Set(Object.keys(cmpDbsSetup).map((id) => `plm_user_info_${id}`)),
  'eprice_main_admin_db',
];

(async () => {
  const client = new MongoClient(ADMIN_URI);
  try {
    await client.connect();
    console.log('Connected to MongoDB as divAdmin\n');

    const adminDb = client.db('admin');

    for (const db of TENANT_DBS) {
      try {
        await adminDb.command({
          grantRolesToUser: PLM_USER,
          roles: [{ role: 'readWrite', db }],
        });
        console.log(`✓  Granted readWrite on ${db}`);
      } catch (err) {
        console.error(`✗  Failed for ${db}: ${err.message}`);
      }
    }

    console.log('\nDone. Restart the Node server now.');
  } catch (err) {
    console.error('Connection failed:', err.message);
  } finally {
    await client.close();
  }
})();
