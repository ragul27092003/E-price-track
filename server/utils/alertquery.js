const User = require('../models/User');

// ─── buildAlertQuery ──────────────────────────────────────────────────────────
// Returns the Mongo filter (on ept_product_details_new) for "products this
// logged-in user should be alerted on", scoped by user_alert_id AND cmpid.
//
// Rules (mirrors the original logic in productsController.getAlertProducts):
// - user_type === 'user'         → only products where user_alert_id contains
//                                   this user's own user_id.
// - user_type === 'store_admin'  → products alerted-on by ANY user belonging
//                                   to this store_admin's cmpid.
// - user_type === 'super_admin'  → products alerted-on by the store_admin of
//                                   whichever tenant is selected (x-tenant-id).
//
// Always scoped to the current tenant because req.user.user_id / the tenant
// user list is itself looked up by cmpid, and the query always runs against
// req.tenantDb (already resolved from x-tenant-id by tenantResolver).
async function buildAlertQuery(req) {
  const { user_id, user_type } = req.user;

  const baseFilter = {
    status: 'active',
    ean_product_data_details_scrap_status: 'completed',
  };

  if (user_type === 'user') {
    return { ...baseFilter, user_alert_id: user_id };
  }

  const tenantCmpid = req.headers['x-tenant-id'] || req.user.cmpid;

  if (user_type === 'super_admin') {
    const storeAdmin = await User
      .findOne({ cmpid: tenantCmpid, user_type: 'store_admin' })
      .select('user_id')
      .lean();
    if (!storeAdmin) return null; // no matching store_admin → zero results
    return { ...baseFilter, user_alert_id: storeAdmin.user_id };
  }else{
    return { ...baseFilter, user_alert_id: user_id };
  }

  // store_admin: alerts from any user (store_admin + their 'user' accounts) in this tenant
  // const tenantUsers   = await User.find({ cmpid: tenantCmpid }).select('user_id').lean();
  // const tenantUserIds = tenantUsers.map((u) => u.user_id);
  // if (tenantUserIds.length === 0) return null;
  // return { ...baseFilter, user_alert_id: { $in: tenantUserIds } };
}

module.exports = { buildAlertQuery };
