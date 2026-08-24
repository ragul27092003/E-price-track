export const ADMIN_BASE = import.meta.env.VITE_ADMIN_BASE_PATH || '/eprice/admin';

export const ROUTE = {
  home: "/",
  login: `${ADMIN_BASE}/login`,
  signup: `${ADMIN_BASE}/signup`,
  forgotPassword: `${ADMIN_BASE}/forgot-password`,
  dashboard: `${ADMIN_BASE}/dashboard`,
  productHistory: `${ADMIN_BASE}/product-history`,
  notifications: `${ADMIN_BASE}/notifications`,
  manageFeedSetup: `${ADMIN_BASE}/manage-feed-setup`,
  settings: `${ADMIN_BASE}/settings`,
  competitors: `${ADMIN_BASE}/competitors`,
  products: `${ADMIN_BASE}/products`,
  market: `${ADMIN_BASE}/market`,
  productMapping: `${ADMIN_BASE}/product-mapping`,
  fullsiteRemapping: `${ADMIN_BASE}/fullsite-remapping`,
  smartReports: `${ADMIN_BASE}/smart-reports`,
  pendingSignups: `${ADMIN_BASE}/pending-signups`,
  priceChanges: `${ADMIN_BASE}/price-changes`,
};