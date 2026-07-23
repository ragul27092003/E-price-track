const { getTenantDb } = require('../config/db');

const tenantResolver = (req, res, next) => {
  let storeId = req.headers['x-tenant-id'] || req.user?.cmpid;
  if (!storeId) return res.status(400).json({ message: 'Store ID is required' });


  {/* if (storeId == 'sathya'){
    storeId = 'chennai';
  } */}

  try {
    req.tenantDb = getTenantDb(storeId);
    req.tenantId = storeId;
    next();
  } catch (err) {
    res.status(404).json({ message: err.message });
  }
};

module.exports = tenantResolver;
