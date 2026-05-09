// services/cronService.js

const cron     = require('node-cron');
const axios    = require('axios');
const mongoose = require('mongoose');
const { getTenantDb } = require('../config/db');

const activeCrons = new Map();

// ============================================
// CONVERT 12-HOUR TIME TO 24-HOUR
// ============================================
function convertTo24Hour(timeStr) {
  if (!timeStr) return '06:00';
  if (!timeStr.toUpperCase().includes('AM') && !timeStr.toUpperCase().includes('PM')) {
    return timeStr.trim();
  }
  const upper = timeStr.toUpperCase().trim();
  const isPM  = upper.includes('PM');
  const isAM  = upper.includes('AM');
  const clean = upper.replace('AM', '').replace('PM', '').trim();
  let [h, m]  = clean.split(':').map(Number);
  if (isPM && h !== 12) h += 12;
  if (isAM && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// ============================================
// BUILD CRON EXPRESSION
// ============================================
function buildCronExpression(schedule, scheduleTime) {
  const time24         = convertTo24Hour(scheduleTime);
  const [hour, minute] = time24.split(':');

  switch (schedule) {
    case 'Hourly':  return `${minute} * * * *`;
    case 'Daily':   return `${minute} ${hour} * * *`;
    case 'Weekly':  return `${minute} ${hour} * * 0`;
    case 'Monthly': return `${minute} ${hour} 1 * *`;
    default:        return `${minute} ${hour} * * *`;
  }
}

// ============================================
// TITLE KEYWORDS — for fallback detection
// ============================================
const COLOR_KEYWORDS = [
  'red','blue','green','black','white','silver','gold',
  'grey','gray','pink','yellow','orange','purple','brown',
  'copper','bronze','chrome','beige','cream','navy','violet'
];

const MATERIAL_KEYWORDS = [
  'plastic','metal','steel','aluminium','aluminum','glass',
  'wood','leather','fabric','rubber','copper','iron','alloy',
  'stainless','ceramic','silicone','fiber','carbon'
];

const PATTERN_KEYWORDS = [
  'solid','striped','floral','checked','printed','plain',
  'dotted','geometric','abstract','camouflage','textured'
];

const AGE_GROUP_KEYWORDS = [
  'adult','adults','kids','kid','children','child',
  'baby','babies','infant','toddler','toddlers',
  'teen','teens','teenager','senior','seniors','newborn',
  'boys','boy','girls','girl',
  '0-3','3-6','6-12','1-3','2-4','3-5',
  '5-7','6-8','8-10','10-12','12-14','14-16'
];

const GENDER_KEYWORDS = [
  'men','man','male',
  'women','woman','female',
  'boys','boy','girls','girl',
  'unisex','kids','children'
];

// ============================================
// HELPERS
// ============================================

// Check if any keyword exists in title
function findInTitle(title, keywords) {
  if (!title) return false;
  const lower = title.toLowerCase();
  return keywords.some(word => lower.includes(word));
}

// Check if value is empty
function isEmpty(value) {
  return (
    value === null      ||
    value === undefined ||
    value === ''        ||
    (Array.isArray(value) && value.length === 0)
  );
}

// ============================================
// AUDIT FUNCTION
// ============================================
function auditProduct(product) {
  const issues = [];
  const title  = product.product_name || '';

  // 1. Out of Stock
  if (isEmpty(product.stock) || parseInt(product.stock) === 0) {
    issues.push({
      field:    'stock',
      label:    'Out of Stock',
      priority: 'high',
      status:   'missing'
    });
  }

  // 2. No Colour
  // Check field → fallback to title
  if (isEmpty(product.color) && !findInTitle(title, COLOR_KEYWORDS)) {
    issues.push({
      field:    'color',
      label:    'No Colour',
      priority: 'high',
      status:   'missing'
    });
  }

  // 3. No Age Group
  // Check field → fallback to title
  if (isEmpty(product.age_group) && !findInTitle(title, AGE_GROUP_KEYWORDS)) {
    issues.push({
      field:    'age_group',
      label:    'No Age Group',
      priority: 'high',
      status:   'missing'
    });
  }

  // 4. No Gender
  // Check field → fallback to title
  if (isEmpty(product.gender) && !findInTitle(title, GENDER_KEYWORDS)) {
    issues.push({
      field:    'gender',
      label:    'No Gender',
      priority: 'high',
      status:   'missing'
    });
  }

  // 5. No Material
  // Check field → fallback to title
  if (isEmpty(product.material) && !findInTitle(title, MATERIAL_KEYWORDS)) {
    issues.push({
      field:    'material',
      label:    'No Material',
      priority: 'high',
      status:   'missing'
    });
  }

  // 6. Brand not in title
  if (
    !isEmpty(product.brand) &&
    !isEmpty(title) &&
    !title.toLowerCase().includes(product.brand.toLowerCase())
  ) {
    issues.push({
      field:    'product_name',
      label:    'Brand not in title',
      priority: 'high',
      status:   'issue'
    });
  }

  // 7. No GTIN
  if (isEmpty(product.ean_id)) {
    issues.push({
      field:    'ean_id',
      label:    'No GTIN',
      priority: 'low',
      status:   'missing'
    });
  }

  // 8. No Pattern
  // Check field → fallback to title
  if (isEmpty(product.pattern) && !findInTitle(title, PATTERN_KEYWORDS)) {
    issues.push({
      field:    'pattern',
      label:    'No Pattern',
      priority: 'medium',
      status:   'missing'
    });
  }

  // 9. Proper Casing
  // Fails if ALL CAPS or all lowercase
  if (!isEmpty(title)) {
    const isAllCaps  = title === title.toUpperCase();
    const isAllLower = title === title.toLowerCase();
    if (isAllCaps || isAllLower) {
      issues.push({
        field:    'product_name',
        label:    'Proper casing',
        priority: 'medium',
        status:   'issue'
      });
    }
  }

  // 10. Short product names
  if (isEmpty(title) || title.trim().length < 20) {
    issues.push({
      field:    'product_name',
      label:    'Short product names',
      priority: 'medium',
      status:   'issue'
    });
  }

  // 11. No Brand
  // Check field → fallback to title
  if (isEmpty(product.brand)) {
    issues.push({
      field:    'brand',
      label:    'No Brand',
      priority: 'high',
      status:   'missing'
    });
  }

  // Score calculation
  const totalChecks = 11;
  const score       = Math.round(
    ((totalChecks - issues.length) / totalChecks) * 100
  );

  return {
    issues,
    score,
    summary: {
      high:   issues.filter(i => i.priority === 'high').length,
      medium: issues.filter(i => i.priority === 'medium').length,
      low:    issues.filter(i => i.priority === 'low').length,
    }
  };
}

// ============================================
// SAVE AUDIT TO feed_audit_products
// ============================================
async function saveAuditResult(tenantDb, product, auditResult) {
  const auditCollection = tenantDb.collection('feed_audit_products');

  await auditCollection.updateOne(
    { sourceId: String(product.item_code || product.ean_id) },
    {
      $set: {
        sourceId:     String(product.item_code || product.ean_id),
        product_name: product.product_name,
        brand:        product.brand,
        category:     product.category,
        issues:       auditResult.issues,
        score:        auditResult.score,
        summary:      auditResult.summary,
        updatedAt:    new Date(),
      },
      $setOnInsert: { createdAt: new Date() }
    },
    { upsert: true }
  );
}

// ============================================
// FETCH PRODUCTS + AUDIT
// ============================================
async function importFeedForTenant(tenantId, feed) {
  try {
    console.log(`[CRON] ▶ Starting import — tenant: ${tenantId}, feed: ${feed.feedName}`);

    // Step 1: Fetch products from URL
    const response = await axios.get(feed.importUrl, { timeout: 30000 });
    const data     = response.data;

    // Step 2: Normalize to array
    let products = [];
    if (Array.isArray(data)) {
      products = data;
    } else if (data.products && Array.isArray(data.products)) {
      products = data.products;
    } else if (data.items && Array.isArray(data.items)) {
      products = data.items;
    } else {
      console.log(`[CRON] ⚠ Unknown data format for tenant: ${tenantId}`);
      return;
    }

    console.log(`[CRON] ✔ Fetched ${products.length} products for tenant: ${tenantId}`);

    // Step 3: Get tenant DB + collections
    const tenantDb    = getTenantDb(tenantId);
    const productsCol = tenantDb.collection('products');
    const auditLogCol = tenantDb.collection('audit');

    // Step 4: Mark ALL existing products inactive before import
    await productsCol.updateMany(
      { tenantId: tenantId },
      {
        $set: {
          is_active:     false,
          deactivatedAt: new Date(),
        }
      }
    );
    console.log(`[CRON] ✔ Marked all products inactive for tenant: ${tenantId}`);

    let newCount        = 0;
    let updatedCount    = 0;
    let unchangedCount  = 0;
    let auditSummary    = { high: 0, medium: 0, low: 0 };

    // Step 5: Upsert each product
    for (const product of products) {
      const uniqueId = product.item_code || product.ean_id || product.id;
      if (!uniqueId) continue;

      const result = await productsCol.updateOne(
        { sourceId: String(uniqueId) },
        {
          $set: {
            ...product,
            sourceId:      String(uniqueId),
            feedId:        String(feed._id),
            tenantId:      tenantId,
            is_active:     true,   // ← restore active
            deactivatedAt: null,   // ← clear deactivation
            updatedAt:     new Date(),
          },
          $setOnInsert: {
            importedAt: new Date(),
          }
        },
        { upsert: true }
      );

      // MongoDB result tells us exactly what happened
      if (result.upsertedCount > 0) {
        newCount++;                // 🆕 brand new product
      } else if (result.modifiedCount > 0) {
        updatedCount++;            // ✏️ existing product updated
      } else {
        unchangedCount++;          // ✅ no change
      }

      // Step 6: Audit product fields
      const auditResult = auditProduct(product);
      await saveAuditResult(tenantDb, product, auditResult);

      auditSummary.high   += auditResult.summary.high;
      auditSummary.medium += auditResult.summary.medium;
      auditSummary.low    += auditResult.summary.low;
    }

    // Step 7: Count inactive products (removed from feed)
    const inactiveCount = await productsCol.countDocuments({
      tenantId:  tenantId,
      is_active: false,
    });

    console.log(`[CRON] ✔ Import done:`);
    console.log(`        🆕 New:       ${newCount}`);
    console.log(`        ✏️  Updated:   ${updatedCount}`);
    console.log(`        ✅ Unchanged:  ${unchangedCount}`);
    console.log(`        💤 Inactive:  ${inactiveCount}`);
    console.log(`[CRON] ✔ Audit — High: ${auditSummary.high}, Medium: ${auditSummary.medium}, Low: ${auditSummary.low}`);

    // Step 8: Save import log
    await auditLogCol.insertOne({
      action:           'feed_import',
      feedId:           String(feed._id),
      feedName:         feed.feedName,
      totalProducts:    products.length,
      newProducts:      newCount,
      updatedProducts:  updatedCount,
      unchangedProducts: unchangedCount,
      inactiveProducts: inactiveCount,
      auditSummary:     auditSummary,
      importedAt:       new Date(),
    });

  } catch (error) {
    console.error(`[CRON] ✖ Error for tenant ${tenantId}:`, error.message);
  }
}

// ============================================
// REGISTER CRON FOR ONE TENANT
// ============================================
function registerFeedCron(tenantId, feed) {
  const key = `${tenantId}_${feed._id}`;

  if (activeCrons.has(key)) {
    activeCrons.get(key).stop();
    console.log(`[CRON] ↺ Restarting cron for tenant: ${tenantId}`);
  }

  const cronExpr = buildCronExpression(feed.schedule, feed.scheduleTime);

  if (!cron.validate(cronExpr)) {
    console.error(`[CRON] ✖ Invalid cron expression: ${cronExpr}`);
    return;
  }

  const job = cron.schedule(cronExpr, () => {
    console.log(`[CRON] ⏰ Triggered for tenant: ${tenantId}`);
    importFeedForTenant(tenantId, feed);
  });

  activeCrons.set(key, job);
  console.log(`[CRON] ✔ Registered — tenant: ${tenantId}, expression: "${cronExpr}"`);
}

// ============================================
// INIT ALL CRONS ON SERVER START
// ============================================
async function initAllCrons() {
  try {
    console.log('[CRON] 🚀 Initializing all cron jobs...');

    // Read from merchants collection in main DB
    const mainDb    = mongoose.connection.useDb('eprice_main_admin_db');
    const merchants = await mainDb.collection('merchants')
      .find({ status: 'active' })
      .toArray();

    console.log(`[CRON] Found ${merchants.length} merchants`);

    for (const merchant of merchants) {
      const tenantId = merchant.companyId;
      const feedInfo = merchant.feed_info;

      if (!tenantId || !feedInfo?.feed_url || !feedInfo?.schedule_info) {
        console.log(`[CRON] ⚠ Skipping: ${tenantId} — missing feed config`);
        continue;
      }

      registerFeedCron(tenantId, {
        _id:          merchant._id,
        feedName:     feedInfo.feed_name || feedInfo.store_name || tenantId,
        importUrl:    feedInfo.feed_url,
        schedule:     feedInfo.schedule_info,
        scheduleTime: feedInfo.import_time,
      });
    }

    console.log(`[CRON] ✔ Total jobs initialized: ${activeCrons.size}`);
  } catch (error) {
    console.error('[CRON] ✖ Initialization error:', error.message);
  }
}

// ============================================
// GET CRON STATUS
// ============================================
function getCronStatus() {
  const status = [];

  for (const [key, job] of activeCrons.entries()) {
    const [tenantId, feedId] = key.split('_');
    status.push({
      key,
      tenantId,
      feedId,
      running: job.options?.scheduled ?? true,
    });
  }

  return {
    totalJobs: activeCrons.size,
    jobs:      status,
    checkedAt: new Date(),
  };
}

module.exports = {
  initAllCrons,
  registerFeedCron,
  getCronStatus,
  importFeedForTenant
};
