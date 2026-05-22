// Per-company MongoDB credentials — exact port of cmp_dbs_setup.php
// database = live_ean_* (same as PHP, NOT plm_user_info_*)
// username = live_ean_{cmpid_no_underscores}  (user created inside that DB)
// password = dssDBRead@987
// authSource omitted — MongoDB defaults to the database itself (same as PHP behaviour)
const HOST = '35.154.230.134:27017';
const PASS = 'dssDBRead@987';

module.exports = {
  bharath_electronics: {
    hostname: HOST, username: 'live_ean_bharathelectronics', password: PASS,
    database: 'live_ean_bharath_electronics',
  },
  bharathelectronics: {
    hostname: HOST, username: 'live_ean_bharathelectronics', password: PASS,
    database: 'live_ean_bharath_electronics',
  },
  sathya: {
    hostname: HOST, username: 'live_ean_sathya', password: PASS,
    database: 'live_ean_sathya',
  },
  sathya_store: {
    hostname: HOST, username: 'live_ean_sathyastore', password: PASS,
    database: 'live_ean_sathya_store',
  },
  poorvika: {
    hostname: HOST, username: 'live_ean_poorvika', password: PASS,
    database: 'live_ean_poorvika',
  },
  supreme_mobiles: {
    hostname: HOST, username: 'live_ean_suprememobiles', password: PASS,
    database: 'live_ean_supreme_mobiles',
  },
  vasanth_co: {
    hostname: HOST, username: 'live_ean_vasanthco', password: PASS,
    database: 'live_ean_vasanth_co',
  },
  ecommartsale: {
    hostname: HOST, username: 'live_ean_ecommartsale', password: PASS,
    database: 'live_ean_ecommartsale',
  },
  ajiohhmart: {
    hostname: HOST, username: 'live_ean_ajiohhmart', password: PASS,
    database: 'live_ean_ajiohhmart',
  },
  epricetrack: {
    hostname: HOST, username: 'live_ean_epricetrack', password: PASS,
    database: 'live_ean_epricetrack',
  },
  nandilathgmart: {
    hostname: HOST, username: 'live_ean_nandilathgmart', password: PASS,
    database: 'live_ean_nandilathgmart',
  },
  epricetag: {
    hostname: HOST, username: 'live_ean_epricetag', password: PASS,
    database: 'live_ean_epricetag',
  },
  uae_ebuyble: {
    hostname: HOST, username: 'dssDBRead', password: PASS,
    database: 'live_dss_uae_ebuyble',
  },
  super_admin: {
    hostname: HOST, username: 'live_ean_superadmin', password: PASS,
    database: 'live_ean_super_admin',
  },
};
