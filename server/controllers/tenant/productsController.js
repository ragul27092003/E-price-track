const { ObjectId } = require('mongodb');

// Helper: parse a price value that may be a number, numeric string, or "No Result"
function toPrice(raw) {
  if (raw === null || raw === undefined || raw === 'No Result' || raw === '') return null;
  const n = typeof raw === 'number' ? raw : parseFloat(raw);
  return isNaN(n) ? null : n;
}

// Helper: normalise competitor stock from numeric product_stock OR string product_stock_status.
// Returns: 0 = out of stock, positive number = in stock (count when available), null = unknown.
function resolveStock(doc) {
  if (!doc) return null;

  // Numeric field takes priority (0, 1, 2, ...)
  if (doc.product_stock !== null && doc.product_stock !== undefined) {
    const n = parseInt(doc.product_stock, 10);
    if (!isNaN(n)) return n;
  }

  // String status field
  if (typeof doc.product_stock_status === 'string') {
    const s = doc.product_stock_status.toLowerCase().trim();
    if (s === 'out of stock' || s === 'out_of_stock' || s === '0' || s === 'no result') return 0;
    if (s === 'in stock'     || s === 'in_stock'     || s === 'instock'                ) return 1;
  }

  return null;
}

exports.getAll = async (req, res) => {
  try {
    const db = req.tenantDb;

    // ── 1. Competitors ────────────────────────────────────────────────────────
    const competitors = await db.collection('ept_competitor_info').find({}).toArray();

    // ── 2. Products ───────────────────────────────────────────────────────────
    const products = await db.collection('ept_product_details_new').find({}).toArray();
    const eanIds   = [...new Set(products.map((p) => p.product_ean_id).filter(Boolean))];

    // ── 3. Competitor current prices (one collection per slug) ─────────────────
    // competitorMap[slug][ean_id] = competitor doc
    // Three matching strategies per competitor:
    //   1. product_ean_id  (direct EAN match)
    //   2. {slug}_unique_id (e.g. reliancedigital_unique_id on both sides)
    //   3. product_code == competitor_product_code
    const productCodes = [...new Set(products.map((p) => p.product_code).filter(Boolean))];

    const competitorMap = {};
    await Promise.all(
      competitors.map(async (comp) => {
        const slug          = comp.competitor_slug;
        const collection    = `ept_product_details_new_${slug}`;
        const uniqueIdField = `${slug}_unique_id`;

        try {
          // Gather all possible match values from our product list
          const uniqueIds = [...new Set(products.map((p) => p[uniqueIdField]).filter(Boolean))];

          // Build $or query with all applicable strategies
          const conditions = [];
          if (eanIds.length)       conditions.push({ product_ean_id:           { $in: eanIds       } });
          if (uniqueIds.length)    conditions.push({ [uniqueIdField]:           { $in: uniqueIds    } });
          if (productCodes.length) conditions.push({ competitor_product_code:  { $in: productCodes } });

          if (!conditions.length) { competitorMap[slug] = {}; return; }

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
                  product_stock:           1,
                  product_stock_status:    1,
                  product_image:           1,
              }}
            )
            .toArray();

          // Build reverse-lookup maps: uniqueId → ean, productCode → ean
          const eanByUniqueId = {};
          const eanByCode     = {};
          for (const p of products) {
            if (p[uniqueIdField] && p.product_ean_id) eanByUniqueId[p[uniqueIdField]] = p.product_ean_id;
            if (p.product_code   && p.product_ean_id) eanByCode[p.product_code]       = p.product_ean_id;
          }

          // Map each competitor doc → product EAN (first match wins)
          const map = {};
          for (const d of docs) {
            const ean = d.product_ean_id                          // strategy 1: direct EAN
                     || eanByUniqueId[d[uniqueIdField]]           // strategy 2: {slug}_unique_id
                     || eanByCode[d.competitor_product_code]      // strategy 3: product_code
                     || null;
            if (ean && !map[ean]) map[ean] = d;
          }

          competitorMap[slug] = map;
        } catch {
          competitorMap[slug] = {};
        }
      })
    );

    // ── 4. 30-day history ─────────────────────────────────────────────────────
    // historyMap[ean_id] = [ { display_date, product_price, competitors: { slug: price } }, ... ]
    const historyDocs = await db
      .collection('ept_display_info_30_days_backup')
      .find({ product_ean_id: { $in: eanIds } })
      .sort({ display_date: -1 })
      .toArray();

    const historyMap = {};
    for (const doc of historyDocs) {
      const ean = doc.product_ean_id;
      if (!historyMap[ean]) historyMap[ean] = [];
      if (historyMap[ean].length >= 30) continue; // cap at 30 entries per product

      const compPrices = {};
      for (const comp of competitors) {
        const s         = comp.competitor_slug;
        compPrices[s]   = toPrice(doc[`${s}_product_price`]);
      }
      historyMap[ean].push({
        display_date:  doc.display_date,
        product_price: toPrice(doc.product_price),
        competitors:   compPrices,
      });
    }

    // ── 5. Enrich each product ────────────────────────────────────────────────
    const enriched = products.map((product) => {
      const ean          = product.product_ean_id;
      const ourPrice     = toPrice(product.product_price);

      // Current competitor prices + price gap
      const competitor_prices = competitors.map((comp) => {
        const slug      = comp.competitor_slug;
        const cd        = competitorMap[slug]?.[ean];
        const compPrice = toPrice(cd?.product_price);
        return {
          slug,
          name:      comp.competitor_name || slug,
          price:     compPrice,
          price_gap: compPrice !== null && ourPrice !== null ? compPrice - ourPrice : null,
          url:       cd?.product_url  || null,
          stock:     resolveStock(cd),
          image:     cd?.product_image || null,
        };
      });

      return {
        ...product,
        competitor_prices,
        price_history_30days: historyMap[ean] || [],
      };
    });

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
