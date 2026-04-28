const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB connected: ${process.env.MONGO_URI}`);
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  }
};

const getTenantDb = (storeId) => {
  const dbName = `eprice_store_admin_${storeId}`;
  return mongoose.connection.useDb(dbName, { useCache: true });
};

module.exports = { connectDB, getTenantDb };
