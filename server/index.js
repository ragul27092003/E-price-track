require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectDB } = require('./config/db');
const { initAllCrons } = require('./services/cronService');
const cronRoutes = require('./routes/cronRoutes');
const path = require('path');

const app = express();

// Trust reverse proxies (Nginx / Cloudflare / AWS Load Balancer) to get real client IP
app.set('trust proxy', true);

app.use(cors({
  origin: [
    'http://13.126.139.15:3001', 'http://13.234.228.110:3001', 'http://localhost:8080', 'http://localhost:5173', 'http://localhost:3000', 'https://epricetrack.com'
  ],
  credentials: true,
}));
app.use(express.json());

// ─── Static file serving ─────────────────────────────────────────────────────
// Use path.resolve() so paths work correctly on Windows regardless of where
// node is started from (unlike path.join() which is relative to cwd).
app.use('/assets', express.static(path.resolve(__dirname, 'assets')));
app.use('/uploads', express.static(path.resolve(__dirname, 'uploads')));

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
app.use('/api/dashboard', require('./routes/tenant/dashboard'));
app.use('/api/smart-reports', require('./routes/tenant/smartReports'));
app.use('/api/product-history', require('./routes/tenant/productHistory'));
app.use('/api/cron', cronRoutes);

app.post('/api/test-signup', (req, res) => res.json({ ok: true, body: req.body }));
app.get('/', (req, res) => res.json({ message: 'Product Feed Studio API running' }));

const PORT = process.env.PORT || 5000;

connectDB().then(async () => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

  // await initAllCrons();
});
