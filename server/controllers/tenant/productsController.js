const { ObjectId } = require('mongodb');

// Helper: parse a price value that may be a number, numeric string, or "No Result"
function toPrice(raw) {
  if (raw === null || raw === undefined || raw === 'No Result' || raw === '') return null;
  const n = typeof raw === 'number' ? raw : parseFloat(raw);
  return isNaN(n) ? null : n;
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
    const competitorMap = {};
    await Promise.all(
      competitors.map(async (comp) => {
        const slug       = comp.competitor_slug;
        const collection = `ept_product_details_new_${slug}`;
        console.log("checking comp",collection,eanIds)
        try {
          const docs = await db
            .collection(collection)
            .find({ product_ean_id: { $in: eanIds } }, { projection: { product_ean_id: 1, product_price: 1, product_url: 1, product_stock_status: 1, product_image: 1 } })
            .toArray();
          competitorMap[slug] = Object.fromEntries(docs.map((d) => [d.product_ean_id, d]));
        } catch {
          // collection may not exist for this tenant yet
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
          name:       comp.competitor_name || slug,
          price:      compPrice,
          price_gap:  compPrice !== null && ourPrice !== null ? compPrice - ourPrice : null,
          url:        cd?.product_url          || null,
          stock:      cd?.product_stock_status || null,
          image:      cd?.product_image        || null,
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
