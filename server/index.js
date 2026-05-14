require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectDB } = require('./config/db');
const { initAllCrons } = require('./services/cronService');
const cronRoutes       = require('./routes/cronRoutes');
const auditRoutes = require('./routes/auditRoutes');
const path = require('path');

const app = express();

app.use(cors({
  origin: ['http://localhost:8080', 'http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));
app.use(express.json());
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/tenant/products'));
app.use('/api/feeds', require('./routes/tenant/feeds'));
app.use('/api/audit', require('./routes/tenant/audit'));
app.use('/api/title-rules', require('./routes/tenant/titleRules'));
app.use('/api/custom-labels', require('./routes/tenant/customLabels'));
app.use('/api/output-feeds', require('./routes/tenant/outputFeeds'));
app.use('/api/settings', require('./routes/tenant/settings'));
app.use('/api/competitors', require('./routes/tenant/competitors'));
app.use('/api/dashboard',  require('./routes/tenant/dashboard'));
app.use('/api/product-history', require('./routes/tenant/productHistory'));
app.use('/api/cron', cronRoutes);
app.use('/api/audit', auditRoutes);

app.post('/api/test-signup', (req, res) => res.json({ ok: true, body: req.body }));
app.get('/', (req, res) => res.json({ message: 'Product Feed Studio API running' }));

const PORT = process.env.PORT || 5000;

connectDB().then(async () => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  
  // ✅ Cron jobs start 
  const { initAllCrons } = require('./services/cronService');
  await initAllCrons();
});
