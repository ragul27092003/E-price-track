const mongoose = require('mongoose');
// getAdminDb no longer needed — all admin data now comes from plm_admin_manage_info (MONGO_URI)

// Competitor slug → product collection name mapping
const SLUG_TO_COLLECTION = {
  amazon:           'ept_product_details_new_amazon',
  croma:            'ept_product_details_new_croma',
  reliancedigital:  'ept_product_details_new_reliancedigital',
  supreme_mobiles:  'ept_product_details_new_supreme_mobiles',
  flipkart:         'ept_product_details_new_flipkart',
  vijaysales:       'ept_product_details_new_vijaysales',
};

// ─── helper: parse price (mirrors toPrice in productsController) ──────────────
function toPrice(raw) {
  if (raw === null || raw === undefined || raw === 'No Result' || raw === 'no result' || raw === '') return null;
  const n = typeof raw === 'number' ? raw : parseFloat(String(raw).replace(/[₹,\s]/g, ''));
  if (isNaN(n) || n <= 0) return null;
  return n;
}

// ─── helper: compute avg price delta for one competitor ───────────────────────
async function computeAvgPriceDelta(db, slug, ourPriceMap) {
  const colName = SLUG_TO_COLLECTION[slug];
  if (!colName) return '+0.0%';

  // Only products with a real numeric price
  const cmpProducts = await db.collection(colName).find({
    product_price: { $exists: true, $nin: ['No Result', null, '', 'no result', 0, '0'] },
  }).toArray();

  const deltas = [];
  for (const cp of cmpProducts) {
    const rawPrice = cp.product_price;
    if (!rawPrice) continue;

    const cmpPrice = parseFloat(String(rawPrice).replace(/[₹,\s]/g, ''));

    // DYNAMIC TENANT FIX: Find whatever key ends with '_product_code'
    const productCodeKey = Object.keys(cp).find(key => key.endsWith('_product_code')) || 'product_code';
    const mappedProductCode = cp[productCodeKey];

    const ourPrice = ourPriceMap[mappedProductCode];

    if (!isNaN(cmpPrice) && cmpPrice > 0 && ourPrice && ourPrice > 0) {
      deltas.push(((cmpPrice - ourPrice) / ourPrice) * 100);
    }
  }

  if (deltas.length === 0) return '+0.0%';
  const avg = deltas.reduce((a, b) => a + b, 0) / deltas.length;
  return `${avg >= 0 ? '+' : ''}${avg.toFixed(1)}%`;
}

// ─── FIX: compute productsTracked using the SAME live join as Products page ───
//
// BUG THAT WAS HERE:
//   productsTracked was read from ept_dashbaord_statics.competitor_count, which
//   is a pre-computed/static number representing the TOTAL documents in the
//   competitor's raw scrape collection (e.g. all Amazon products scraped).
//
//   But the Products page (/products?competitor=<slug>) filters our own products
//   by doing a live JOIN via EAN / slug_unique_id / competitor_product_code and
//   only keeps products where the competitor has a VALID (non-null) price.
//
//   These two counts are different:
//     • ept_dashbaord_statics  → total competitor products (no join, no price check)
//     • Products page filter   → our products with a matching non-null competitor price
//
// FIX:
//   Replace the ept_dashbaord_statics lookup with this function, which replicates
//   the exact join + price-null-check logic from productsController.enrichProducts
//   so both pages show the same count.
// ─────────────────────────────────────────────────────────────────────────────
// ─── FIX: compute productsTracked using an Advanced MongoDB JOIN ($lookup) ───
async function computeProductsTracked(db, slug) {
  const compColName = `ept_product_details_new_${slug}`;
  const uniqueIdField = `${slug}_unique_id`;

  const pipeline = [
    // 1. Only look at our ACTIVE and COMPLETED products
    {
      $match: {
        status: 'active',
        ean_product_data_details_scrap_status: 'completed'
      }
    },
    
    // 2. JOIN with the competitor collection using EAN, Unique ID, or Code
    {
      $lookup: {
        from: compColName,
        let: { 
          main_ean: "$product_ean_id", 
          main_uid: `$${uniqueIdField}`, 
          main_code: "$product_code" 
        },
        pipeline: [
          {
            $match: {
              // Competitor product MUST be active, have a price, and be in stock
              status: 'active',
              product_price: { $exists: true, $nin: ['No Result', null, '', 'no result', 0, '0'] },
              product_stock: { $nin: ['Out Of Stock', 'Out of stock', 'out of stock', '0', 0] },
              
              // MUST match at least one of the IDs (ignoring nulls/empty strings)
              $expr: {
                $or: [
                  { $and: [ { $ne: ["$$main_ean", null] }, { $ne: ["$$main_ean", ""] }, { $eq: ["$product_ean_id", "$$main_ean"] } ] },
                  { $and: [ { $ne: ["$$main_uid", null] }, { $ne: ["$$main_uid", ""] }, { $eq: [`$${uniqueIdField}`, "$$main_uid"] } ] },
                  { $and: [ { $ne: ["$$main_code", null] }, { $ne: ["$$main_code", ""] }, { $eq: ["$competitor_product_code", "$$main_code"] } ] }
                ]
              }
            }
          }
        ],
        as: 'competitor_data'
      }
    },
    
    // 3. ONLY keep products that successfully found a match in the competitor DB
    {
      $match: {
        "competitor_data.0": { $exists: true } 
      }
    },
    
    // 4. Count the total
    {
      $count: "trackedCount"
    }
  ];

  try {
    const result = await db.collection('ept_product_details_new').aggregate(pipeline).toArray();
    return result.length > 0 ? result[0].trackedCount : 0;
  } catch (err) {
    console.error(`computeProductsTracked(${slug}) error:`, err.message);
    return 0;
  }
}
// ─── GET /api/competitors ─────────────────────────────────────────────────────
exports.getAll = async (req, res) => {
  try {
    const db = req.tenantDb;

    // 1. Client DB: competitor list
    const clientComps = await db.collection('ept_competitor_info').find({}).toArray();

    // 2. Main DB: mapping_type + color + website + logos per competitor slug
    const mainMap    = {};
    const adminLogoMap = {};
    try {
      const mainComps = await mongoose.connection.db.collection('plm_admin_competitor').find({}, {
        projection: {
          competitor_slug:       1,
          mapping_type:          1,
          color:                 1,
          competitor_site:       1,
          competitor_search_url: 1,
          competitor_logo:       1,
          competitor_full_logo:  1,
        },
      }).toArray();
      mainComps.forEach(m => {
        if (!m.competitor_slug) return;
        mainMap[m.competitor_slug]     = m;
        adminLogoMap[m.competitor_slug] = m;
      });
    } catch (e) {
      console.warn('Could not read from plm_admin_manage_info.competitors:', e.message);
    }

    // 3. Fetch pre-calculated static counts directly to match Dashboard numbers (e.g., MyG = 809)
    const staticCountsMap = {};
    try {
      const staticDocs = await db.collection('ept_dashbaord_statics').find({ status: 'active' }).toArray();
      staticDocs.forEach(doc => {
        const slug = doc.competitor_name || '';
        const rawCount = doc.competitor_count?.$numberLong || doc.competitor_count?.toString() || 0;
        if (slug) {
          staticCountsMap[slug.toLowerCase().trim()] = parseInt(rawCount, 10) || 0;
        }
      });
    } catch (e) {
      console.warn('Could not read from ept_dashbaord_statics:', e.message);
    }

    // 4. Our own product prices → { product_code: price } (for avgPriceDelta)
    const ourProducts = await db.collection('ept_product_details_new').find({
      status: 'active',
      ean_product_data_details_scrap_status: 'completed'
    }).toArray();

    const ourPriceMap = {};
    ourProducts.forEach(p => {
      const price = parseFloat(String(p.product_store_price || p.product_sap_price || '').replace(/[₹,\s]/g, ''));
      if (p.product_code && !isNaN(price) && price > 0) {
        ourPriceMap[p.product_code] = price;
      }
    });

    // 5. Build response for each competitor
    const data = await Promise.all(clientComps.map(async (c) => {
      const slug = c.competitor_slug || '';
      const main = mainMap[slug] || {};

      const rawType = (
        main.mapping_type ||
        c.mapping_type    ||
        'ean'
      ).toLowerCase().trim();

      const mappingType = (rawType === 'ean') ? 'EAN' : 'NON_EAN';

      // Use the static pre-calculated collection count to ensure it reflects 809
      const normalizedSlug = slug.toLowerCase().trim();
      const productsTracked = staticCountsMap[normalizedSlug] !== undefined 
        ? staticCountsMap[normalizedSlug] 
        : 0;

      const avgPriceDelta = await computeAvgPriceDelta(db, slug, ourPriceMap);

      return {
        id:              c._id,
        name:            c.competitors    || c.competitor_name || 'Unknown',
        logo:            (adminLogoMap[slug] || {}).competitor_logo      || c.competitor_logo      || '',
        fullLogo:        (adminLogoMap[slug] || {}).competitor_full_logo || c.competitor_full_logo || '',
        website:         main.competitor_site        || c.competitor_site        || '',
        searchUrl:       main.competitor_search_url  || c.competitor_search_url  || '',
        color:           main.color || '#475e77',
        mappingType,
        isActive:        c.competitor_status === 'enable',
        avgPriceDelta,
        productsTracked,  // ← Now matches your Dashboard Overview list exactly!
        lastSync:        c.modified_date || 'Never',
        slug,
      };
    }));

    res.json(data);
  } catch (err) {
    console.error('competitorsController.getAll error:', err);
    res.status(500).json({ message: err.message });
  }
};
// ─── POST /api/competitors ────────────────────────────────────────────────────
exports.create = async (req, res) => {
  try {
    const { name, website, searchUrl, color, mappingType } = req.body;
    const now  = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const slug = name.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

    const doc = {
      competitors:           name,
      competitor_name:       name.toLowerCase().trim(),
      competitor_slug:       slug,
      competitor_logo:       '',
      competitor_full_logo:  '',
      competitor_site:       website   || '',
      competitor_search_url: searchUrl || '',
      color:                 color     || '#475e77',
      mapping_type:          (mappingType || 'EAN').toLowerCase().replace(' ', '_'),
      competitor_status:     'enable',
      status:                'active',
      cmpid:                 req.tenantId,
      created_date:          now,
      modified_date:         now,
    };

    const result = await req.tenantDb.collection('ept_competitor_info').insertOne(doc);

    res.status(201).json({
      ...doc,
      id:              result.insertedId,
      isActive:        true,
      mappingType:     mappingType || 'EAN',
      productsTracked: 0,
      avgPriceDelta:   '+0.0%',
      lastSync:        now,
    });
  } catch (err) {
    console.error('competitorsController.create error:', err);
    res.status(500).json({ message: err.message });
  }
};

// ─── PATCH /api/competitors/:slug/logo  (super_admin only) ───────────────────
//
// HOW THE GLOBAL IMAGE WORKS:
//   Competitor logos are stored in  plm_admin_manage_info.competitors
//   — the main DB from MONGO_URI in .env (the DB that changed).
//   This is the single source of truth shared across all tenants.
//   One upload by super_admin → every store that reads this competitor
//   sees the new logo automatically.
//
//   The file lands at:  server/assets/competitorlogos/<slug>.<ext>
//   Served at:          GET /assets/competitorlogos/<slug>.<ext>
//
// PERMISSION:
//   roleCheck('super_admin') in the route blocks store_admin with 403.
// ─────────────────────────────────────────────────────────────────────────────
exports.uploadLogo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided.' });
    }

    const slug = req.params.slug;

    // multer-storage-cloudinary puts the full Cloudinary URL in req.file.path
    const logoUrl = req.file.path;

    // ── 1. Update plm_admin_manage_info.competitors (main DB from MONGO_URI) ──
    //    All tenants read from this collection, so every store sees the new
    //    logo immediately — no local file serving needed.
    const mainDb = mongoose.connection.db;
    await mainDb.collection('plm_admin_competitor').updateOne(
      { competitor_slug: slug },
      { $set: { competitor_logo: logoUrl, competitor_full_logo: logoUrl } },
      { upsert: true }
    );

    // ── 2. Return the Cloudinary URL ─────────────────────────────────────────
    res.json({
      message: 'Competitor logo updated successfully.',
      slug,
      logoUrl,
    });
  } catch (err) {
    console.error('competitorsController.uploadLogo error:', err);
    res.status(500).json({ message: err.message });
  }
};

// ─── PATCH /api/competitors/:id/toggle ───────────────────────────────────────
exports.toggleSync = async (req, res) => {
  try {
    const { ObjectId } = require('mongodb');
    const { isActive } = req.body;
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    await req.tenantDb.collection('ept_competitor_info').updateOne(
      { _id: new ObjectId(req.params.id) },
      {
        $set: {
          competitor_status: isActive ? 'enable' : 'disable',
          status:            isActive ? 'active'  : 'inactive',
          modified_date:     now,
        },
      }
    );

    res.json({ id: req.params.id, isActive, lastSync: now });
  } catch (err) {
    console.error('competitorsController.toggleSync error:', err);
    res.status(500).json({ message: err.message });
  }
};
// ─── GET /api/competitors/available ───────────────────────────────────────────
// Returns competitors from the global admin pool (plm_admin_competitor) that
// THIS store hasn't added yet. The same competitor (e.g. Amazon) can be added
// by many different stores — `selected_company` is an array of tenant IDs
// that have already added it. The array itself is excluded from the response.
exports.getAvailable = async (req, res) => {
  try {
    const mainDb   = mongoose.connection.db;
    const tenantId = req.tenantId;

    const admins = await mainDb.collection('plm_admin_competitor').find(
      { selected_company: { $nin: [tenantId] } },
      { projection: { selected_company: 0 } }
    ).toArray();

    const data = admins.map((a) => ({
      slug:         a.competitor_slug,
      name:         a.competitors || a.competitor_name || a.competitor_slug || 'Unknown',
      logo:         a.competitor_logo      || '',
      fullLogo:     a.competitor_full_logo || '',
      website:      a.competitor_site        || '',
      searchUrl:    a.competitor_search_url  || '',
      color:        a.color || '#475e77',
      mappingType:  ((a.mapping_type || 'ean').toLowerCase() === 'ean') ? 'EAN' : 'NON_EAN',
    }));

    data.sort((a, b) =>
      (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' })
    );


    res.json(data);
  } catch (err) {
    console.error('competitorsController.getAvailable error:', err);
    res.status(500).json({ message: err.message });
  }
};

// ─── POST /api/competitors/assign/:slug ───────────────────────────────────────
// Assigns a competitor from the global admin pool to the current store:
//   1. Adds tenantId into `selected_company` (an array) on the admin doc, so
//      this store won't see it in "available" again — but OTHER stores can
//      still independently add the same competitor (e.g. Amazon).
//   2. Copies its details into this tenant's ept_competitor_info collection
//      so it immediately shows up in this store's Competitors list.
exports.assignCompetitor = async (req, res) => {
  try {
    const { slug } = req.params;
    const tenantId = req.tenantId;
    const mainDb   = mongoose.connection.db;

    const adminComp = await mainDb.collection('plm_admin_competitor').findOne({ competitor_slug: slug });
    if (!adminComp) {
      return res.status(404).json({ message: 'Competitor not found in admin pool.' });
    }

    // Add this store to the list of stores that have selected this competitor.
    // $addToSet is used instead of $push so a duplicate click never adds the
    // same tenantId twice, and instead of $set so other stores' entries stay intact.
    await mainDb.collection('plm_admin_competitor').updateOne(
      { competitor_slug: slug },
      { $addToSet: { selected_company: tenantId } }
    );

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const doc = {
      competitors:           adminComp.competitors || adminComp.competitor_name || slug,
      competitor_name:       (adminComp.competitor_name || adminComp.competitors || slug).toLowerCase().trim(),
      competitor_slug:       slug,
      competitor_logo:       adminComp.competitor_logo      || '',
      competitor_full_logo:  adminComp.competitor_full_logo || '',
      competitor_site:       adminComp.competitor_site        || '',
      competitor_search_url: adminComp.competitor_search_url  || '',
      color:                 adminComp.color || '#475e77',
      mapping_type:          (adminComp.mapping_type || 'ean').toLowerCase(),
      competitor_status:     'enable',
      status:                'active',
      cmpid:                 tenantId,
      created_date:          now,
      modified_date:         now,
    };

    const result = await req.tenantDb.collection('ept_competitor_info').insertOne(doc);

    res.status(201).json({
      id:              result.insertedId,
      name:            doc.competitors,
      logo:            doc.competitor_logo,
      fullLogo:        doc.competitor_full_logo,
      website:         doc.competitor_site,
      searchUrl:       doc.competitor_search_url,
      color:           doc.color,
      mappingType:     doc.mapping_type === 'ean' ? 'EAN' : 'NON_EAN',
      isActive:        true,
      avgPriceDelta:   '+0.0%',
      productsTracked: 0,
      lastSync:        now,
      slug,
    });
  } catch (err) {
    console.error('competitorsController.assignCompetitor error:', err);
    res.status(500).json({ message: err.message });
  }
};

// ─── DELETE /api/competitors/:id  (super_admin only) ─────────────────────────
// Removes a competitor from this store's list, and also pulls this tenant's
// id out of the admin pool's `selected_company` array so the competitor
// becomes available again in "Add Competitor" for this store (in case it
// was added by mistake and they want to re-add it correctly later).
exports.remove = async (req, res) => {
  try {
    const { ObjectId } = require('mongodb');
    const tenantId = req.tenantId;
    const { id } = req.params;

    const existing = await req.tenantDb.collection('ept_competitor_info').findOne({ _id: new ObjectId(id) });
    if (!existing) {
      return res.status(404).json({ message: 'Competitor not found.' });
    }

    await req.tenantDb.collection('ept_competitor_info').deleteOne({ _id: new ObjectId(id) });

    // Pull this tenant out of the admin pool's selected_company array so it
    // shows up again in "Add Competitor" for this store.
    if (existing.competitor_slug) {
      const mainDb = mongoose.connection.db;
      await mainDb.collection('plm_admin_competitor').updateOne(
        { competitor_slug: existing.competitor_slug },
        { $pull: { selected_company: tenantId } }
      );
    }

    res.json({ id, deleted: true });
  } catch (err) {
    console.error('competitorsController.remove error:', err);
    res.status(500).json({ message: err.message });
  }
};

// ─── GET /api/competitors/debug-mapping  (temporary — remove after fixing) ───
// Hit this endpoint to see EXACTLY what mapping_type each DB has per slug.
// curl http://localhost:5100/api/competitors/debug-mapping
exports.debugMapping = async (req, res) => {
  try {
    const db = req.tenantDb;

    const clientComps = await db.collection('ept_competitor_info').find(
      {}, { projection: { competitor_slug: 1, mapping_type: 1, competitors: 1 } }
    ).toArray();

    let mainComps = [];
    try {
      mainComps = await mongoose.connection.db.collection('plm_admin_competitor').find(
        {}, { projection: { competitor_slug: 1, mapping_type: 1 } }
      ).toArray();
    } catch(e) { mainComps = [{ error: e.message }]; }

    res.json({
      tenant_ept_competitor_info: clientComps.map(c => ({
        name: c.competitors,
        slug: c.competitor_slug,
        mapping_type: c.mapping_type ?? '(missing)',
      })),
      plm_admin_manage_info_competitors: mainComps.map(m => ({
        slug: m.competitor_slug,
        mapping_type: m.mapping_type ?? '(missing)',
      })),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
