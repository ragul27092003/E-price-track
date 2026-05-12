const { ObjectId } = require('mongodb');
const mongoose     = require('mongoose');

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

  const eanIds      = [...new Set(products.map((p) => p.product_ean_id).filter(Boolean))];
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
                product_stock_status:    1,
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
      return {
        slug,
        name:      comp.competitor_name || slug,
        price:     compPrice,
        price_gap: compPrice !== null && ourPrice !== null ? compPrice - ourPrice : null,
        url:       cd?.product_url          || null,
        stock:     cd?.product_stock_status || null,
        image:     cd?.product_image        || null,
      };
    });

    return {
      ...product,
      competitor_prices,
      price_history_30days: historyMap[ean] || [],
    };
  });
}

// ── GET /api/products ─────────────────────────────────────────────────────────
exports.getAll = async (req, res) => {
  try {
    const db       = req.tenantDb;
    const products = await db.collection('ept_product_details_new').find({}).toArray();
    let enriched   = await enrichProducts(db, products);

    const { competitor: filterSlug } = req.query;
    if (filterSlug) {
      enriched = enriched.filter((p) =>
        p.competitor_prices.some((c) => c.slug === filterSlug && c.price !== null)
      );
    }

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── GET /api/products/alert ───────────────────────────────────────────────────
// Returns products the current user should be alerted on.
// - userType === 'user'  → only products where user_alert_id contains req.user.userId
// - store_admin / super_admin → all products that have at least one user_alert_id set
exports.getAlertProducts = async (req, res) => {
  try {
    const db                    = req.tenantDb;
    const { userId, userType }  = req.user;

    let query = {};
    if (userType === 'user') {
      query = { user_alert_id: userId };
    } else {
      // admins see every product that has been configured for alerts
      query = { user_alert_id: { $exists: true, $not: { $size: 0 } } };
    }

    const products = await db.collection('ept_product_details_new').find(query).toArray();
    const enriched = await enrichProducts(db, products);
    res.json(enriched);
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
