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

// ─── helper: compute avg price delta for one competitor ───────────────────────
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

    // Remove currency symbols / commas → parse float
    const cmpPrice = parseFloat(String(rawPrice).replace(/[₹,\s]/g, ''));
    
    // DYNAMIC TENANT FIX: Find whatever key ends with '_product_code' (e.g., suryaelectronics_product_code)
    // Fallback to 'product_code' just in case.
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

// ─── GET /api/competitors ─────────────────────────────────────────────────────
exports.getAll = async (req, res) => {
  try {
    const db = req.tenantDb;

    // 1. Client DB: competitor list
    const clientComps = await db.collection('ept_competitor_info').find({}).toArray();

    // 2. Client DB: dashboard statics → productsTracked count per competitor
    //    ept_dashbaord_statics has { competitor_name: 'amazon', competitor_count: 18 }
    const statsDocs = await db.collection('ept_dashbaord_statics').find({}).toArray();
    const statsMap  = {};
    statsDocs.forEach(s => {
      if (s.competitor_name) statsMap[s.competitor_name] = s.competitor_count || 0;
    });

    // 3. Main DB: mapping_type + color + website per competitor slug
    const mainDb    = mongoose.connection.useDb('eprice_main_admin_db', { useCache: true });
    const mainComps = await mainDb.collection('competitors').find({}, {
      projection: { competitor_slug: 1, mapping_type: 1, color: 1,
                    competitor_site: 1, competitor_search_url: 1 },
    }).toArray();
    const mainMap = {};
    mainComps.forEach(m => { if (m.competitor_slug) mainMap[m.competitor_slug] = m; });

    // 4. Our own product prices → { product_code: price }
    const ourProducts = await db.collection('ept_product_details_new').find({}).toArray();
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

      // mapping_type: from main DB ('ean'/'item code') or default EAN
      const rawType    = (main.mapping_type || 'ean').toLowerCase();
      const mappingType = rawType === 'ean' ? 'EAN' : 'NON_EAN';

      // productsTracked from dashboard statics (competitor_name is the slug)
      const productsTracked = statsMap[slug] ?? statsMap[c.competitor_name] ?? 0;

      // avgPriceDelta: computed from real product price comparison
      const avgPriceDelta = await computeAvgPriceDelta(db, slug, ourPriceMap);

      return {
        id:              c._id,
        name:            c.competitors    || c.competitor_name || 'Unknown',
        logo:            c.competitor_logo      || '',
        fullLogo:        c.competitor_full_logo || '',
        website:         main.competitor_site        || c.competitor_site        || '',
        searchUrl:       main.competitor_search_url  || c.competitor_search_url  || '',
        color:           main.color || '#475e77',
        mappingType,                  // 'EAN' or 'NON_EAN'  ← frontend splits on this
        isActive:        c.competitor_status === 'enable',
        avgPriceDelta,                // e.g. '+2.3%' or '-1.1%'
        productsTracked,              // from ept_dashbaord_statics
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
