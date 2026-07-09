function toPrice(raw) {
  if (raw === null || raw === undefined || raw === 'No Result' || raw === '') return null;
  const n = typeof raw === 'number' ? raw : parseFloat(raw);
  return isNaN(n) ? null : n;
}

function toStock(raw) {
  if (raw === null || raw === undefined || raw === 'No Result' || raw === '') return null;
  const n = typeof raw === 'number' ? raw : parseFloat(raw);
  return (isNaN(n) || n < 0) ? null : n;
}

async function buildCompetitorMap(db, products, onlineCompetitors) {
  const eanIds       = [...new Set(products.map((p) => p.product_ean_id).filter(Boolean))];
  const productCodes = [...new Set(products.map((p) => p.product_code).filter(Boolean))];
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
                product_stock:           1,
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

  return competitorMap;
}

function mapCompetitorPrices(product, onlineCompetitors, competitorMap) {
  const ean      = product.product_ean_id;
  const ourPrice = toPrice(product.product_price);

  return onlineCompetitors.map((comp) => {
    const slug      = comp.competitor_slug;
    const cd        = competitorMap[slug]?.[ean];
    const compPrice = toPrice(cd?.product_price);
    const stockStr  = String(cd?.product_stock || '').toLowerCase();
    const isExplicitlyOos = stockStr.includes('out of stock') || stockStr === '0';
    const is_listed = !!cd && (compPrice !== null || isExplicitlyOos);

    return {
      slug,
      name:      comp.competitor_name || slug,
      price:     compPrice,
      price_gap: compPrice !== null && ourPrice !== null ? compPrice - ourPrice : null,
      url:       cd?.product_url   || null,
      stock:     cd?.product_stock || null,
      is_listed,
      image:     cd?.product_image || null,
    };
  });
}

async function enrichProductsLight(db, products) {
  if (!products.length) return [];

  const allCompetitors    = await db.collection('ept_competitor_info').find({}).toArray();
  const onlineCompetitors = allCompetitors.filter((c) => c.competitor_status === 'enable');
  const competitorMap     = await buildCompetitorMap(db, products, onlineCompetitors);

  return products.map((product) => ({
    ...product,
    product_stock: toStock(product.product_stock),
    competitor_prices: mapCompetitorPrices(product, onlineCompetitors, competitorMap),
    price_history_30days: [],
  }));
}

async function enrichProducts(db, products) {
  if (!products.length) return [];

  const allCompetitors    = await db.collection('ept_competitor_info').find({}).toArray();
  const onlineCompetitors = allCompetitors.filter((c) => c.competitor_status === 'enable');
  const eanIds            = [...new Set(products.map((p) => p.product_ean_id).filter(Boolean))];
  const competitorMap     = await buildCompetitorMap(db, products, onlineCompetitors);

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
      const s = comp.competitor_slug;
      compPrices[s] = toPrice(doc[`${s}_product_price`]);
    }
    historyMap[ean].push({
      display_date:  doc.display_date,
      product_price: toPrice(doc.product_price),
      competitors:   compPrices,
    });
  }

  return products.map((product) => ({
    ...product,
    product_stock: toStock(product.product_stock),
    competitor_prices: mapCompetitorPrices(product, onlineCompetitors, competitorMap),
    price_history_30days: historyMap[product.product_ean_id] || [],
  }));
}

module.exports = { enrichProducts, enrichProductsLight, toPrice, toStock };
