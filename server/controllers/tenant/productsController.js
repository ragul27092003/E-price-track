const { ObjectId } = require('mongodb');
const mongoose     = require('mongoose');
const User         = require('../../models/User');
const { buildAlertQuery } = require('../../utils/alertquery');
const { compareImages } = require('../../utils/imageCompare');
const { getPriceMatchStatus } = require("../../utils/priceCompare");
const { getBrandMatchStatus } = require("../../utils/brandCompare");
const { getNameMatchStatus } = require("../../utils/nameCompare");
const crypto = require("crypto");
const fs = require("fs");
const csv = require("csv-parser");

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
                product_rating:          1,
                product_review:          1,
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
      const uniqueId  = cd?.[`${slug}_unique_id`];
      

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
        unique_id: uniqueId,
        image:     cd?.product_image || null,
        product_rating: cd?.product_rating ?? null,
        product_review: cd?.product_review ?? null,
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

exports.fullsiteMapping = async (req, res) => {

  try {

    const db = req.tenantDb;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 1;
    const skip = (page - 1) * limit;

    const { search, competitor, mappingstatus } = req.query;

    const filter = {
      status: "active",
    };

    if (search) {
      filter.$or = [
        { product_name: { $regex: search, $options: "i" } },
        { product_code: { $regex: search, $options: "i" } },
        { product_ean_id: { $regex: search, $options: "i" } },
      ];
    }

    if (competitor) {
      filter.product_url_change_competitior_name = competitor;
    }

    if (mappingstatus) {
      filter.mapping_status = mappingstatus;
    }

    const collection = db.collection("ept_full_site_mapping_data_info");

    const countFilter = { ...filter };
    delete countFilter.mapping_status;
    const statusCounts = await collection.aggregate([
      { $match: countFilter },
      {
        $group: {
          _id: "$mapping_status",
          count: { $sum: 1 }
        }
      }
    ]).toArray();

    const completedCount =
      statusCounts.find(x => x._id === "completed")?.count || 0;

    const pendingCount =
      statusCounts.find(x => x._id === "pending")?.count || 0;

    const total = await collection.countDocuments(filter);

    const rows = await collection
      .find(filter)
      .sort({ mapping_status: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    
    const products = await Promise.all(
      rows.map(async (item, index) => {

        const imageResult = await compareImages(
          item.product_image,
          item.product_url_change_competitior_web_image
        );

        const priceResult = await getPriceMatchStatus(
          item.product_price,
          item.product_url_change_competitior_web_price
        );
        
        const brandResult = await getBrandMatchStatus(
          item.product_brand,
          item.product_url_change_competitior_web_brand
        );

        const nameResult = await getNameMatchStatus(
          item.product_name,
          item.product_url_change_competitior_web_name
        );

        return {

          id: skip + index + 1,
          ean: item.product_ean_id,
          productCode: item.product_code,
          mpn: item.product_mpn,
          mapping_status: item.mapping_status,


          store: {
            name: item.product_name,
            price: `₹ ${item.product_price}`,
            brand: item.product_brand,
            image: item.product_image,
            link: item.product_url,
          },

          competitor: {
            compname:item.product_url_change_competitior_name, 
            name: item.product_url_change_competitior_web_name,
            price: `₹ ${item.product_url_change_competitior_web_price}`,
            brand: item.product_url_change_competitior_web_brand,
            image: item.product_url_change_competitior_web_image,
            link: item.product_url_change_competitior_web_url,
            logo: `/assets/competitorlogos/${item.product_url_change_competitior_name}_full.png`,
          },

          status: {

            image:
              imageResult.status,

            price:
              priceResult.status,

            brand:
              brandResult.status,

            name:
              nameResult.status,
          },
        };
      })
    ); 
    
    return res.status(200).json({
      success: true,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      counts: {
        completed: completedCount,
        pending: pendingCount,
      },
      data: products,
    });

  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};


exports.fullsiteMappingUpdation = async (req, res) => {

  try {

    const db = req.tenantDb;
    
    const update = {};

    if (req.body.mapping_status) {
      update.mapping_status = req.body.mapping_status;
    }

    if (req.body.product_url_change_competitior_web_url) {
      update.product_url_change_competitior_web_url =
        req.body.product_url_change_competitior_web_url;
    }

    if (req.body.status) {
      update.status = req.body.status;
    }

    const result = await db.collection("ept_full_site_mapping_data_info").updateOne(
      {
        product_ean_id: req.body.ean,
        product_code: req.body.productCode,
        product_url_change_competitior_name: req.body.productCompetitor, 
      },
      {
        $set: update,
      }
    );

    return res.status(200).json({
      success: true,
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.completedProductsExport = async (req, res) => {

  try {
    
    const db = req.tenantDb;

    const data = await db
      .collection("ept_full_site_mapping_data_info")
      .find({
        mapping_status: "completed",
        status: "active",
      })
      .project({
        _id: 0,
        product_ean_id: 1,
        product_code: 1,
        product_mpn: 1,
        product_name: 1,
        product_url: 1,
        product_url_change_competitior_name: 1,
        product_url_change_competitior_web_url: 1,
        status: 1,
      })
      .toArray();

    if (!data.length) {
      return res.status(404).json({
        success: false,
        message: "No completed products found.",
      });
    }

    // Remove MongoDB _id
    const rows = data.map(({ _id, ...rest }) => rest);

    // CSV Headers
    const headers = Object.keys(rows[0]);

    // Escape CSV values
    const escapeCSV = (value) => {
      if (value === null || value === undefined) return "";

      const str = String(value);

      // Escape quotes
      const escaped = str.replace(/"/g, '""');

      return `"${escaped}"`;
    };

    // Build CSV
    let csv = headers.join(",") + "\n";

    rows.forEach((row) => {
      const values = headers.map((header) => escapeCSV(row[header]));
      csv += values.join(",") + "\n";
    });

    // Download
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=completed_products_${Date.now()}.csv`
    );

    return res.status(200).send(csv);

  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.importFullsiteMapping = async (req, res) => {
  try {
    const db = req.tenantDb;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload a CSV file.",
      });
    }

    const rows = [];

    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on("data", (data) => {
        // Remove empty CSV column names / keys
        const cleanRow = Object.fromEntries(
          Object.entries(data).filter(
            ([key, value]) => key && key.trim() !== ""
          )
        );

        rows.push(cleanRow);
      })
      .on("end", async () => {
        try {
          if (!rows.length) {
            if (fs.existsSync(req.file.path)) {
              fs.unlinkSync(req.file.path);
            }

            return res.status(400).json({
              success: false,
              message: "CSV file is empty.",
            });
          }

          const operations = [];

          rows.forEach((row, index) => {
            const {
              product_ean_id,
              product_code,
              product_url_change_competitior_name,
              ...updateFields
            } = row;

            // Validate required fields
            if (
              !product_ean_id ||
              !product_code ||
              !product_url_change_competitior_name
            ) {
              console.log(`Skipping invalid CSV row ${index + 1}:`, row);
              return;
            }

            // Remove empty values if required
            const cleanUpdateFields = Object.fromEntries(
              Object.entries(updateFields).filter(
                ([key, value]) => key && key.trim() !== ""
              )
            );

            // Don't create an empty $set
            if (Object.keys(cleanUpdateFields).length === 0) {
              console.log(`Skipping empty update row ${index + 1}`);
              return;
            }

            operations.push({
              updateOne: {
                filter: {
                  product_ean_id: product_ean_id.trim(),
                  product_code: product_code.trim(),
                  product_url_change_competitior_name:
                    product_url_change_competitior_name.trim(),
                },
                update: {
                  $set: cleanUpdateFields,
                  $setOnInsert: {
                    product_ean_id: product_ean_id.trim(),
                    product_code: product_code.trim(),
                    product_url_change_competitior_name:
                      product_url_change_competitior_name.trim(),
                  },
                },
                upsert: true,
              },
            });
          });

          if (!operations.length) {
            if (fs.existsSync(req.file.path)) {
              fs.unlinkSync(req.file.path);
            }

            return res.status(400).json({
              success: false,
              message: "No valid rows found in CSV.",
            });
          }

          const result = await db
            .collection("ept_full_site_mapping_data_info")
            .bulkWrite(operations);

          if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
          }

          return res.status(200).json({
            success: true,
            total: rows.length,
            processed: operations.length,
            inserted: result.upsertedCount,
            updated: result.modifiedCount,
            matched: result.matchedCount,
          });
        } catch (err) {
          console.error("Import error:", err);

          if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
          }

          return res.status(500).json({
            success: false,
            message: err.message,
          });
        }
      });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.deleteProductCompetitor = async (req, res) => {
  try {
    const { id } = req.params;
    const { cmpid, comp_name } = req.query;

    if (!id || !cmpid || !comp_name) {
      return res.status(400).json({
        success: false,
        message: "unique_id, cmpid and comp_name are required"
      });
    }

    const competitor = String(comp_name).toLowerCase();

    // Dynamic unique ID field
    const uniqueIdField = `${competitor}_unique_id`;

    // ----------------------------------------
    // 1. Delete competitor document completely
    // ----------------------------------------

    const competitorCollectionName =
      `ept_product_details_new_${competitor}`;

    const competitorResult = await req.tenantDb
      .collection(competitorCollectionName)
      .deleteOne({
        [uniqueIdField]: String(id)
      });

    // ----------------------------------------
    // 2. Remove ONLY dynamic unique_id field
    // ----------------------------------------

    const mainResult = await req.tenantDb
      .collection("ept_product_details_new")
      .updateOne(
        {
          [uniqueIdField]: String(id)
        },
        {
          $unset: {
            [uniqueIdField]: ""
          }
        }
      );

    if (
      competitorResult.deletedCount === 0 &&
      mainResult.modifiedCount === 0
    ) {
      return res.status(404).json({
        success: false,
        message: "Competitor product not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Competitor deleted and unique_id removed successfully",
      competitorDeletedCount: competitorResult.deletedCount,
      uniqueIdRemovedCount: mainResult.modifiedCount
    });

  } catch (error) {
    console.error("Delete competitor error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete competitor product",
      error: error.message
    });
  }
};

exports.updateProductCompetitor = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      cmpid,
      comp_name,
      product_url,
      product_ean_id,
      product_code,
    } = req.body;

    if (
      !id ||
      !cmpid ||
      !comp_name ||
      !product_url ||
      !product_ean_id ||
      !product_code
    ) {
      return res.status(400).json({
        success: false,
        message:
          "id, cmpid, comp_name, product_url, product_ean_id and product_code are required",
      });
    }

    const db = req.tenantDb;

    const collectionName = `ept_product_details_new_${comp_name}`;
    const collection = db.collection(collectionName);

    const mainCollection = db.collection("ept_product_details_new");

    const uniqueField = `${comp_name}_unique_id`;
    const eanField = `${cmpid}_product_id`;
    const codeField = `${cmpid}_product_code`;

    const currentDate = new Date().toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
    });

    const updateData = {
      [eanField]: product_ean_id,
      [codeField]: product_code,
      [uniqueField]: id,

      logo_image: `/assets/competitorlogos/${comp_name}_full.png`,
      cmp_name: comp_name,

      product_name: "No Result",
      product_image: "No Result",
      product_price: "No Result",
      product_stock: "No Result",

      product_url: product_url.trim(),
      product_scrape_status: "pending",

      status: "active",
      competitor_status: "enable",

      product_review: 0,
      product_rating: 0,

      [`${comp_name}_product_url_manual_update`]: "Yes",
      [`${comp_name}_nikshan_product_url_manual_update_date`]:
        currentDate,

      pricechange: {
        status: "pending",
        decreasedValue: 0,
        increasedValue: 0,
        oldPriceValue: 0,
        newPriceValue: 0,
      },

      modified_date: currentDate,
    };


    const result = await collection.updateOne(
      {
        [eanField]: product_ean_id,
        [codeField]: product_code,
      },
      {
        $set: updateData,

        $setOnInsert: {
          created_date: currentDate,
        },
      },
      {
        upsert: true,
      }
    );

    // Update main product with competitor unique ID
    const mainResult = await mainCollection.updateOne(
      {
        product_ean_id,
        product_code,
      },
      {
        $set: {
          [uniqueField]: id,
        },
      }
    );

    if (result.matchedCount > 0) {
      return res.status(200).json({
        success: true,
        action: "updated",
        message: "Product URL updated successfully",
        modifiedCount: result.modifiedCount,
      });
    }

    if (result.upsertedCount > 0) {
      return res.status(201).json({
        success: true,
        action: "inserted",
        message: "Competitor product not found, so new product inserted",
        insertedId: result.upsertedId,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Product update/insert failed",
    });
  } catch (error) {
    console.error("Update product competitor error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update/insert product URL",
      error: error.message,
    });
  }
};