const { ObjectId } = require('mongodb');
const mongoose     = require('mongoose');
const User         = require('../../models/User');

function toPrice(raw) {
  if (raw === null || raw === undefined || raw === 'No Result' || raw === '') return null;
  const n = typeof raw === 'number' ? raw : parseFloat(raw);
  return isNaN(n) ? null : n;
}

// ── Shared enrichment: adds competitor_prices + price_history_30days to each product ──
async function enrichProducts(db, products) {
  if (!products.length) return [];

  const allCompetitors    = await db.collection('ept_competitor_info').find({}).toArray();
  const onlineCompetitors = allCompetitors.filter((c) => c.competitor_status === 'enable');

  const eanIds       = [...new Set(products.map((p) => p.product_ean_id).filter(Boolean))];
  const productCodes = [...new Set(products.map((p) => p.product_code).filter(Boolean))];

  // Build per-competitor price map
  const competitorMap = {};
  await Promise.all(
    onlineCompetitors.map(async (comp) => {
      const slug          = comp.competitor_slug;
      const collection    = `ept_product_details_new_${slug}`;
      const uniqueIdField = `${slug}_unique_id`;
      try {
        const uniqueIds  = [...new Set(products.map((p) => p[uniqueIdField]).filter(Boolean))];
        const conditions = [];
        if (eanIds.length)       conditions.push({ product_ean_id:          { $in: eanIds       } });
        if (uniqueIds.length)    conditions.push({ [uniqueIdField]:          { $in: uniqueIds    } });
        if (productCodes.length) conditions.push({ competitor_product_code: { $in: productCodes } });
        if (!conditions.length)  { competitorMap[slug] = {}; return; }

        const docs = await db
          .collection(collection)
          .find(
            conditions.length === 1 ? conditions[0] : { $or: conditions },
            { projection: {
                product_ean_id:          1,
                [uniqueIdField]:         1,
                competitor_product_code: 1,
                product_price:           1,
                product_url:             1,
                product_stock:           1, // FIX: Changed from product_stock_status to match DB
                product_image:           1,
            }}
          )
          .toArray();

        const eanByUniqueId = {};
        const eanByCode     = {};
        for (const p of products) {
          if (p[uniqueIdField] && p.product_ean_id) eanByUniqueId[p[uniqueIdField]] = p.product_ean_id;
          if (p.product_code   && p.product_ean_id) eanByCode[p.product_code]       = p.product_ean_id;
        }

        const map = {};
        for (const d of docs) {
          const ean = d.product_ean_id
                   || eanByUniqueId[d[uniqueIdField]]
                   || eanByCode[d.competitor_product_code]
                   || null;
          if (ean && !map[ean]) map[ean] = d;
        }
        competitorMap[slug] = map;
      } catch {
        competitorMap[slug] = {};
      }
    })
  );

  // Build 30-day history map
  const historyDocs = await db
    .collection('ept_display_info_30_days_backup')
    .find({ product_ean_id: { $in: eanIds } })
    .sort({ display_date: -1 })
    .toArray();

  const historyMap = {};
  for (const doc of historyDocs) {
    const ean = doc.product_ean_id;
    if (!historyMap[ean]) historyMap[ean] = [];
    if (historyMap[ean].length >= 30) continue;
    const compPrices = {};
    for (const comp of onlineCompetitors) {
      const s       = comp.competitor_slug;
      compPrices[s] = toPrice(doc[`${s}_product_price`]);
    }
    historyMap[ean].push({
      display_date:  doc.display_date,
      product_price: toPrice(doc.product_price),
      competitors:   compPrices,
    });
  }

  // Enrich
  // Enrich
  return products.map((product) => {
    const ean      = product.product_ean_id;
    const ourPrice = toPrice(product.product_price);

    const competitor_prices = onlineCompetitors.map((comp) => {
      const slug      = comp.competitor_slug;
      const cd        = competitorMap[slug]?.[ean];
      const compPrice = toPrice(cd?.product_price);
      
      // ── THE FIX: Smart "is_listed" logic ──
      // 1. Check if the database explicitly says it's out of stock
      const stockStr = String(cd?.product_stock || '').toLowerCase();
      const isExplicitlyOos = stockStr.includes('out of stock') || stockStr === '0';
      
      // 2. Only consider it "listed" if we have a real price OR it is explicitly out of stock.
      // This forces "No Result" scraping errors to be ignored and hidden from the UI.
      const is_listed = !!cd && (compPrice !== null || isExplicitlyOos);

      return {
        slug,
        name:      comp.competitor_name || slug,
        price:     compPrice,
        price_gap: compPrice !== null && ourPrice !== null ? compPrice - ourPrice : null,
        url:       cd?.product_url   || null,
        stock:     cd?.product_stock || null,
        is_listed: is_listed, 
        image:     cd?.product_image || null,
      };
    });

    return {
      ...product,
      competitor_prices,
      price_history_30days: historyMap[ean] || [],
    };
  });
}

// ── GET /api/products/meta ────────────────────────────────────────────────────
// Returns unique brands / categories / ranks / itemGroups for filter dropdowns.
exports.getMeta = async (req, res) => {
  try {
    const docs = await req.tenantDb
      .collection('ept_product_details_new')
      .find({}, { projection: { product_brand: 1, product_category: 1, rank_by: 1 } })
      .toArray();

    const brands     = [...new Set(docs.map((d) => d.product_brand).filter(Boolean))].sort();
    const categories = [...new Set(docs.map((d) => d.product_category).filter(Boolean))].sort();
    const ranks      = [...new Set(docs.map((d) => String(d.rank_by || '')).filter(Boolean))].sort();
    const itemGroups = [...new Set(docs.map((d) =>
      d.product_category ? d.product_category.split('>')[0].trim() : ''
    ).filter(Boolean))].sort();

    res.json({ brands, categories, ranks, itemGroups });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── GET /api/products ─────────────────────────────────────────────────────────
exports.getAll = async (req, res) => {
  try {
    const db    = req.tenantDb;
    const page  = Math.max(1, parseInt(req.query.page  || '1', 10));
    const limit = Math.max(1, parseInt(req.query.limit || '20', 10)); // Match frontend 20 limit
    const skip  = (page - 1) * limit;
    
    const { competitor: filterSlug, search, brand, category, rank, itemGroup } = req.query;

    // 1. Initial filter for Active & Completed products
    const mongoFilter = {
      status: 'active',
      ean_product_data_details_scrap_status: 'completed'
    };

    // ── THE FIX: USE DASHBOARD STATICS TO GUARANTEE EXACT COUNT (e.g. 809) ──
    if (filterSlug) {
      const staticDoc = await db.collection('ept_dashbaord_statics').findOne({
        competitor_name: filterSlug.toLowerCase().trim(),
        status: 'active'
      });

      if (staticDoc && Array.isArray(staticDoc.productEanIds) && staticDoc.productEanIds.length > 0) {
        // Force MongoDB to ONLY pull the exact EANs that make up the 809 count
        mongoFilter.product_ean_id = { $in: staticDoc.productEanIds };
      } else {
        // Fallback if competitor has 0 products
        mongoFilter._id = null; 
      }
    }
    // ────────────────────────────────────────────────────────────────────────

    if (search) {
      const re = { $regex: search, $options: 'i' };
      const searchOr = {
        $or: [
          { product_name:   re },
          { product_brand:  re },
          { product_ean_id: re },
          { product_code:   re },
        ]
      };
      
      if (mongoFilter.$and) {
        mongoFilter.$and.push(searchOr);
      } else {
        mongoFilter.$or = searchOr.$or;
      }
    }
    
    if (brand)         mongoFilter.product_brand    = brand;
    if (category)      mongoFilter.product_category = category;
    else if (itemGroup) {
      const escaped = itemGroup.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      mongoFilter.product_category = { $regex: `^${escaped}`, $options: 'i' };
    }
    
    if (rank) mongoFilter.rank_by = rank;

    const col = db.collection('ept_product_details_new');
    
    // Total count will now accurately reflect the exact number from dashboard (e.g. 809)
    const total = await col.countDocuments(mongoFilter); 
    
    // Pagination happens perfectly on the filtered items
    const products = await col.find(mongoFilter).skip(skip).limit(limit).toArray();
    
    // Enrich with competitor prices
    let enriched = await enrichProducts(db, products);

    // * WE REMOVED THE JAVASCRIPT FILTER HERE! *
    // Now, a full 20 items will be sent to the frontend, even if they are "Out of Stock"
    // or missing prices, perfectly maintaining your pagination layout.

    res.json({ data: enriched, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── GET /api/products/alert ───────────────────────────────────────────────────
// Returns products the current user should be alerted on.
// - user_type === 'user'  → only products where user_alert_id contains req.user.user_id
// - store_admin / super_admin → all products that have at least one user_alert_id set
exports.getAlertProducts = async (req, res) => {
  try {
    const db                    = req.tenantDb;
    const { user_id, user_type } = req.user;
    const page  = Math.max(1, parseInt(req.query.page  || '1', 10));
    const limit = Math.max(1, parseInt(req.query.limit || '9', 10));
    const skip  = (page - 1) * limit;
    console.log(`Fetching alert products for user_id: ${user_id}, user_type: ${user_type}`);

    const baseFilter = {
      status: 'active',
      ean_product_data_details_scrap_status: 'completed',
    };

    let query = {};
    if (user_type === 'user') {
      // MongoDB element match: find docs where user_alert_id array contains this user_id
      query = { ...baseFilter, user_alert_id: user_id };
    } else {
      const tenantCmpid = req.headers['x-tenant-id'] || req.user.cmpid;

      if (user_type === 'super_admin') {
        // super_admin viewing a tenant: find that tenant's store_admin and use their user_id
        const storeAdmin = await User
          .findOne({ cmpid: tenantCmpid, user_type: 'store_admin' })
          .select('user_id')
          .lean();
        console.log(`store_admin for cmpid ${tenantCmpid}:`, storeAdmin?.user_id);
        if (!storeAdmin) return res.json({ data: [], total: 0, page: 1, totalPages: 0 });
        query = { ...baseFilter, user_alert_id: storeAdmin.user_id };
      } else {
        // store_admin: show all products with alerts from any user in this tenant
        const tenantUsers   = await User.find({ cmpid: tenantCmpid }).select('user_id').lean();
        const tenantUserIds = tenantUsers.map((u) => u.user_id);
        console.log(`Tenant users for cmpid ${tenantCmpid}:`, tenantUserIds);
        if (tenantUserIds.length === 0) return res.json({ data: [], total: 0, page: 1, totalPages: 0 });
        query = { ...baseFilter, user_alert_id: { $in: tenantUserIds } };
      }
    }

    const col      = db.collection('ept_product_details_new');
    const total    = await col.countDocuments(query);
    const products = await col.find(query).skip(skip).limit(limit).toArray();
    const enriched = await enrichProducts(db, products);

    res.json({ data: enriched, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const result = await req.tenantDb.collection('ept_product_details_new')
      .insertOne({ ...req.body, createdAt: new Date() });
    res.status(201).json({ message: 'Product created', id: result.insertedId });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    await req.tenantDb.collection('ept_product_details_new').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { ...req.body, updatedAt: new Date() } }
    );
    res.json({ message: 'Product updated' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.remove = async (req, res) => {
  try {
    await req.tenantDb.collection('ept_product_details_new').deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update group_name and user_alert_id for a specific product
exports.configureProduct = async (req, res) => {
  try {
    const { group_name, user_alert_id } = req.body;
    await req.tenantDb.collection('ept_product_details_new').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { group_name, user_alert_id: user_alert_id || [], updatedAt: new Date() } }
    );
    res.json({ message: 'Product configured' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Clear group_name and user_alert_id for a specific product
exports.removeConfiguration = async (req, res) => {
  try {
    await req.tenantDb.collection('ept_product_details_new').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { group_name: '', user_alert_id: [], updatedAt: new Date() } }
    );
    res.json({ message: 'Product configuration removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
