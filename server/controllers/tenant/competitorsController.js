const mongoose = require('mongoose');

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
  return isNaN(n) ? null : n;
}

// ─── helper: compute avg price delta for one competitor ───────────────────────
async function computeAvgPriceDelta(db, slug, ourPriceMap) {
  const colName = SLUG_TO_COLLECTION[slug];
  if (!colName) return '+0.0%';

  // Only products with a real numeric price
  const cmpProducts = await db.collection(colName).find({
    product_price: { $exists: true, $nin: ['No Result', null, '', 'no result'] },
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

    if (!isNaN(cmpPrice) && ourPrice && ourPrice > 0) {
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
async function computeProductsTracked(db, slug, ourProducts) {
  const colName = `ept_product_details_new_${slug}`;

  // Build lookup keys from our product list (mirrors enrichProducts)
  const eanIds       = [...new Set(ourProducts.map(p => p.product_ean_id).filter(Boolean))];
  const productCodes = [...new Set(ourProducts.map(p => p.product_code).filter(Boolean))];
  const uniqueIdField = `${slug}_unique_id`;
  const uniqueIds    = [...new Set(ourProducts.map(p => p[uniqueIdField]).filter(Boolean))];

  const conditions = [];
  if (eanIds.length)       conditions.push({ product_ean_id:          { $in: eanIds       } });
  if (uniqueIds.length)    conditions.push({ [uniqueIdField]:          { $in: uniqueIds    } });
  if (productCodes.length) conditions.push({ competitor_product_code: { $in: productCodes } });
  if (!conditions.length)  return 0;

  try {
    const docs = await db.collection(colName).find(
      conditions.length === 1 ? conditions[0] : { $or: conditions },
      {
        projection: {
          product_ean_id:          1,
          [uniqueIdField]:         1,
          competitor_product_code: 1,
          product_price:           1,
        },
      }
    ).toArray();

    // Build reverse EAN maps (same as enrichProducts)
    const eanByUniqueId = {};
    const eanByCode     = {};
    for (const p of ourProducts) {
      if (p[uniqueIdField] && p.product_ean_id) eanByUniqueId[p[uniqueIdField]] = p.product_ean_id;
      if (p.product_code   && p.product_ean_id) eanByCode[p.product_code]       = p.product_ean_id;
    }

    // Collect EANs that have a valid (non-null) competitor price
    const matchedEans = new Set();
    for (const d of docs) {
      const ean = d.product_ean_id
               || eanByUniqueId[d[uniqueIdField]]
               || eanByCode[d.competitor_product_code]
               || null;
      const price = toPrice(d.product_price);
      if (ean && price !== null) {
        matchedEans.add(ean);
      }
    }

    // Count our products whose EAN was matched with a valid price
    // This is exactly what the Products page filter produces.
    return ourProducts.filter(
      p => p.product_ean_id && matchedEans.has(p.product_ean_id)
    ).length;

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

    // 2. Main DB: mapping_type + color + website per competitor slug
    const mainDb    = mongoose.connection.useDb('eprice_main_admin_db', { useCache: true });
    const mainComps = await mainDb.collection('competitors').find({}, {
      projection: { competitor_slug: 1, mapping_type: 1, color: 1,
                    competitor_site: 1, competitor_search_url: 1 },
    }).toArray();
    const mainMap = {};
    mainComps.forEach(m => { if (m.competitor_slug) mainMap[m.competitor_slug] = m; });

    // 3. Our own product prices → { product_code: price } (for avgPriceDelta)
    //    Also used as the full product list for productsTracked computation.
    const ourProducts = await db.collection('ept_product_details_new').find({}).toArray();
    const ourPriceMap = {};
    ourProducts.forEach(p => {
      const price = parseFloat(String(p.product_store_price || p.product_sap_price || '').replace(/[₹,\s]/g, ''));
      if (p.product_code && !isNaN(price) && price > 0) {
        ourPriceMap[p.product_code] = price;
      }
    });

    // 4. Build response for each competitor
    const data = await Promise.all(clientComps.map(async (c) => {
      const slug = c.competitor_slug || '';
      const main = mainMap[slug] || {};

      const rawType    = (main.mapping_type || 'ean').toLowerCase();
      const mappingType = rawType === 'ean' ? 'EAN' : 'NON_EAN';

      // FIX: use live join count instead of ept_dashbaord_statics
      const productsTracked = await computeProductsTracked(db, slug, ourProducts);

      const avgPriceDelta = await computeAvgPriceDelta(db, slug, ourPriceMap);

      return {
        id:              c._id,
        name:            c.competitors    || c.competitor_name || 'Unknown',
        logo:            c.competitor_logo      || '',
        fullLogo:        c.competitor_full_logo || '',
        website:         main.competitor_site        || c.competitor_site        || '',
        searchUrl:       main.competitor_search_url  || c.competitor_search_url  || '',
        color:           main.color || '#475e77',
        mappingType,
        isActive:        c.competitor_status === 'enable',
        avgPriceDelta,
        productsTracked,  // ← now matches Products page count exactly
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
