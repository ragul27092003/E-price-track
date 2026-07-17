const { ObjectId } = require('mongodb');
const mongoose     = require('mongoose');
const User         = require('../../models/User');
const { buildAlertQuery } = require('../../utils/alertquery');
const crypto = require("crypto");

function toPrice(raw) {
  if (raw === null || raw === undefined || raw === 'No Result' || raw === 'no result' || raw === '') return null;
  const n = typeof raw === 'number' ? raw : parseFloat(String(raw).replace(/[₹,\s]/g, ''));
  if (isNaN(n) || n <= 0) return null;
  return n;
}

function isRemovedProduct(raw) {
  if (raw === null || raw === undefined || raw === '' || raw === 'No Result' || raw === 'no result') return true;
  const n = typeof raw === 'number' ? raw : parseFloat(String(raw).replace(/[₹,\s]/g, ''));
  if (isNaN(n)) return true;
  return n <= 0;
}

function isExplicitlyOosStock(raw) {
  const stockStr = String(raw || '').toLowerCase();
  return stockStr.includes('out of stock') || stockStr === '0';
}

function resolveListing(cd) {
  if (!cd) return { is_listed: false, compPrice: null };

  if (isExplicitlyOosStock(cd.product_stock)) {
    return { is_listed: true, compPrice: toPrice(cd.product_price) };
  }

  if (isRemovedProduct(cd.product_price)) {
    return { is_listed: false, compPrice: null };
  }

  const compPrice = toPrice(cd.product_price);
  return { is_listed: compPrice !== null, compPrice };
}

// 🆕 ADD THIS — sanitizes product_stock: only valid non-negative numbers pass through
function toStock(raw) {
  if (raw === null || raw === undefined || raw === 'No Result' || raw === '') return null;
  const n = typeof raw === 'number' ? raw : parseFloat(raw);
  return (isNaN(n) || n < 0) ? null : n;
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
  return products.map((product) => {
    const ean      = product.product_ean_id;
    const ourPrice = toPrice(product.product_price);

    const competitor_prices = onlineCompetitors.map((comp) => {
      const slug      = comp.competitor_slug;
      const cd        = competitorMap[slug]?.[ean];
      const compPrice = toPrice(cd?.product_price);

      // ── Smart "is_listed" logic ──
      // 1. Check if the database explicitly says it's out of stock
      const stockStr = String(cd?.product_stock || '').toLowerCase();
      const isExplicitlyOos = stockStr.includes('out of stock') || stockStr === '0';

      // 2. Only consider it "listed" if we have a real price (now correctly excludes ₹0)
      // OR it is explicitly out of stock. This hides "No Result"/₹0 scraping errors from the UI.
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
      product_stock: toStock(product.product_stock),
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

    // 🆕 resolve effective alert user id (super_admin → tenant's store_admin id)
    let alertUserId = req.user.user_id;
    if (req.user.user_type === 'super_admin') {
      const tenantCmpid = req.headers['x-tenant-id'] || req.user.cmpid;
      const storeAdmin = await User.findOne({ cmpid: tenantCmpid, user_type: 'store_admin' }).select('user_id').lean();
      if (storeAdmin) alertUserId = storeAdmin.user_id;
    }

    res.json({ brands, categories, ranks, itemGroups, alertUserId });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── GET /api/products ─────────────────────────────────────────────────────────
exports.getAll = async (req, res) => {
  try {
    const db    = req.tenantDb;
    const page  = Math.max(1, parseInt(req.query.page  || '1', 10));
    const status  = req.query.status;
    const limit = Math.max(1, parseInt(req.query.limit || '20', 10)); // Match frontend 20 limit
    const skip  = (page - 1) * limit;

    const { competitor: filterSlug, search, brand, category, rank, itemGroup } = req.query;

    // 1. Initial filter for Active & Completed products
    const mongoFilter = {
      status: 'active',
      ean_product_data_details_scrap_status:status,
    };

    // ── Use dashboard statics to guarantee exact count ──
    if (filterSlug) {
      const staticDoc = await db.collection('ept_dashbaord_statics').findOne({
        competitor_name: filterSlug.toLowerCase().trim(),
        status: 'active'
      });

      if (staticDoc && Array.isArray(staticDoc.productEanIds) && staticDoc.productEanIds.length > 0) {
        // Force MongoDB to ONLY pull the exact EANs that make up the count
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

    if (rank) {
      const numRank = Number(rank);
      mongoFilter.rank_by = isNaN(numRank) ? rank : numRank;
    }

    const col = db.collection('ept_product_details_new');

    // Total count will now accurately reflect the exact number from dashboard
    const total = await col.countDocuments(mongoFilter);

    // Pagination happens perfectly on the filtered items
    const products = await col.find(mongoFilter).skip(skip).limit(limit).toArray();

    // Enrich with competitor prices
    let enriched = await enrichProducts(db, products);

    res.json({ data: enriched, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.exportAll = async (req, res) => {
  try {
    const requestingUser = await User.findOne({ user_id: req.user.user_id });
    if (requestingUser && requestingUser.export_option === 'no') {
      return res.status(403).json({ message: 'Export is disabled for this account' });
    }

    const db = req.tenantDb;
    const { competitor: filterSlug, search, brand, category, rank, itemGroup } = req.query;

    const mongoFilter = {
      status: 'active',
      ean_product_data_details_scrap_status: 'completed'
    };

    if (filterSlug) {
      const staticDoc = await db.collection('ept_dashbaord_statics').findOne({
        competitor_name: filterSlug.toLowerCase().trim(),
        status: 'active'
      });
      if (staticDoc && Array.isArray(staticDoc.productEanIds) && staticDoc.productEanIds.length > 0) {
        mongoFilter.product_ean_id = { $in: staticDoc.productEanIds };
      } else {
        mongoFilter._id = null;
      }
    }

    if (search) {
      const re = { $regex: search, $options: 'i' };
      mongoFilter.$or = [
        { product_name:   re },
        { product_brand:  re },
        { product_ean_id: re },
        { product_code:   re },
      ];
    }

    if (brand)    mongoFilter.product_brand    = brand;
    if (category) mongoFilter.product_category = category;
    else if (itemGroup) {
      const escaped = itemGroup.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      mongoFilter.product_category = { $regex: `^${escaped}`, $options: 'i' };
    }

    if (rank) {
      const numRank = Number(rank);
      mongoFilter.rank_by = isNaN(numRank) ? rank : numRank;
    }

    const col      = db.collection('ept_product_details_new');
    const products = await col.find(mongoFilter).toArray(); // no skip/limit

    const enriched = await enrichProducts(db, products);

    res.json({ data: enriched, total: enriched.length });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// ── GET /api/products/alert ───────────────────────────────────────────────────
exports.getAlertProducts = async (req, res) => {
  try {
    const db    = req.tenantDb;
    const page  = Math.max(1, parseInt(req.query.page  || '1', 10));
    const limit = Math.max(1, parseInt(req.query.limit || '9', 10));
    const skip  = (page - 1) * limit;

    const query = await buildAlertQuery(req);
    if (!query) return res.json({ data: [], total: 0, page: 1, totalPages: 0 });
    const { search } = req.query;
if (search) {
  query.$or = [
    { product_name:   { $regex: search, $options: 'i' } },
    { product_brand:  { $regex: search, $options: 'i' } },
    { product_ean_id: { $regex: search, $options: 'i' } },
    { product_code:   { $regex: search, $options: 'i' } },
  ];
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

exports.pendingMapping = async (req, res) => {
 
  try {
 
    const {
      product_ean_id,
      product_code,
      company_name,
      arrMappingData,
    } = req.body;
 
    const db = req.tenantDb;
 
    // Filter only mappings having URL
    const validMappings = arrMappingData.filter(
      (item) => item.prod_url && item.prod_url.trim() !== ""
    );
 
    // If all URLs are empty
    if (validMappings.length === 0) {
 
      await db.collection("ept_product_details_new").updateOne(
        {
          product_ean_id,
          product_code,
        },
        {
          $set: {
            ean_product_data_details_scrap_status: "completed",
            updatedAt: new Date(),
          },
        }
      );
 
      return res.json({
        success: true,
        message: "Updated successfully",
      });
 
    }
 
    for (const mapping of validMappings) {
      // Validate URL
      try {
        new URL(mapping.prod_url);
      } catch {
        continue;
      }
 
      let product_price = "No Result";
      let product_stock = "Out Of Stock";
 
      if (mapping.prod_price) {
        product_price = parseFloat(
          mapping.prod_price.replace(/[^0-9.]/g, "")
        );
 
        product_stock = "In stock";
      }
 
      // Competitor Status
      const competitorInfo = await db
        .collection("ept_competitor_info")
        .findOne(
          {
            competitor_slug: mapping.competitor_slug,
            status: "active",
          },
          {
            projection: {
              competitor_status: 1,
            },
          }
        );
 
      // Unique Id
      const cmp_unique_id = crypto
        .createHash("md5")
        .update(
          company_name +
            mapping.competitor_slug +
            product_code
        )
        .digest("hex");
 
      // Save competitor document
      await db
        .collection(
          `ept_product_details_new_${mapping.competitor_slug}`
        )
        .updateOne(
          {
            [`${company_name}_product_id`]: product_ean_id,
            [`${company_name}_product_code`]: product_code,
          },
          {
            $set: {
              [`${company_name}_product_id`]: product_ean_id,
              [`${company_name}_product_code`]: product_code,
              [`${mapping.competitor_slug}_unique_id`]: cmp_unique_id,
              product_name: "No Result",
              product_url: mapping.prod_url,
              product_image: "No Result",
              product_price,
              product_stock,
              logo_image:
                `/assets/competitorlogos/${mapping.competitor_slug}_full.png`,
              cmp_name: mapping.competitor_slug,
              product_scrape_status: "completed",
              status: "active",
              competitor_status:
                competitorInfo?.competitor_status || "",
              modified_date: new Date(),
              created_date: new Date(),
            },
          },
          {
            upsert: true,
          }
        );
 
      // Update Main Product
      await db.collection("ept_product_details_new").updateOne(
        {
          product_ean_id,
          product_code,
        },
        {
          $set: {
            [`${mapping.competitor_slug}_unique_id`]:
              cmp_unique_id,
            ean_product_data_details_scrap_status:
              "completed",
            updatedAt: new Date(),
          },
        }
      );
    }
 
    return res.json({
      success: true,
      message: "Mapping saved successfully",
    });
 
  } catch (err) {
 
    console.log(err);
 
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};


exports.webPriceUpdation = async (req, res) => {
  
  try {
    const {
      user_id,
      product_ean_id,
      product_code,
      product_price,
      update_price,
      is_manual_price,
    } = req.body;

    const db = req.tenantDb;

    const manual_price_update =
      Number(is_manual_price) === 1 ? "added" : "removed";

    // Check product exists
    const product = await db.collection("ept_product_details_new").findOne({
      product_ean_id,
      product_code,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    // Insert history
    const insertResult = await db
      .collection("ept_web_price_manual_update_info")
      .insertOne({
        product_ean_id,
        product_code,
        user_id,
        is_manual_price,
        manual_price_update,
        product_price,
        update_price,
        created_date: new Date(),
        modified_date: new Date(),
        last_update_time: new Date(),
        status: "active",
      });

    // Update product
    const updateResult = await db.collection("ept_product_details_new").updateOne(
      {
        product_ean_id,
        product_code,
      },
      {
        $set: {
          product_price: update_price,
          product_sap_price: update_price,
          manual_price_update,
          is_manual_price,
          manual_price_update_modified_date: new Date(),
        },
      }
    );

    return res.status(200).json({
      success: true,
      message: "Web price updated successfully.",
      inserted: insertResult.insertedId,
      matchedCount: updateResult.matchedCount,
      modifiedCount: updateResult.modifiedCount,
    });

  } catch (err) {
    console.error("WEB PRICE UPDATE ERROR:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};


