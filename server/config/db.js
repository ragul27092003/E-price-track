const mongoose = require('mongoose');

// divAdmin connection — has access to all databases including plm_user_info_* and eprice_main_admin_db.
// Established once at startup and reused for every tenant/admin DB lookup.
let tenantConn = null;

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Main DB connected (plm_admin → plm_admin_manage_info)');

    tenantConn = await mongoose.createConnection(process.env.TENANT_MONGO_URI, {
      socketTimeoutMS: 1800000,
    }).asPromise();
    console.log('Tenant/admin DB connection established (divAdmin)');
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  }
};

// Returns a Mongoose Db handle for the given tenant.
// Tenant databases are named: plm_user_info_{storeId}
const getTenantDb = (storeId) => {
  if (!tenantConn) throw new Error('Tenant connection not initialized');
  return tenantConn.useDb(`plm_user_info_${storeId}`, { useCache: true });
};

// Returns a Mongoose Db handle for any named database via the divAdmin connection.
// Use this for cross-DB queries (e.g. eprice_main_admin_db, plm_admin_manage_info).
const getAdminDb = (dbName) => {
  if (!tenantConn) throw new Error('Tenant connection not initialized');
  return tenantConn.useDb(dbName, { useCache: true });
};

module.exports = { connectDB, getTenantDb, getAdminDb };
