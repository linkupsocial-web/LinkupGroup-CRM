const express = require('express');
const cors = require('cors');
const compression = require('compression');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

dotenv.config();

const app = express();

// Connect to Database
connectDB();

// Middleware
const configuredOrigins = [
  process.env.FRONTEND_URL,
  process.env.ALLOWED_ORIGINS,
]
  .filter(Boolean)
  .flatMap((origins) => origins.split(','))
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:4028',
  'http://localhost:4029',
  'http://localhost:5173',
  'https://linkup-group-crm.vercel.app',
  'https://linkup-admin-frontend.vercel.app',
  ...configuredOrigins,
];

app.use(cors({
  origin: function (origin, callback) {
    // Postman, server-to-server requests etc.
    if (!origin) return callback(null, true);

    if (
      allowedOrigins.includes(origin) ||
      /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) ||
      origin.endsWith('.vercel.app')
    ) {
      return callback(null, true);
    }

    return callback(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true,
}));

// Compress JSON, HTML and other text responses larger than 1 KB. Media files
// already use their own compression, so the middleware leaves them untouched.
app.use(compression({ threshold: 1024 }));

// Keep browser-admin data fresh while allowing a CDN to serve public reads
// quickly. Mutations and authenticated account/settings endpoints must never
// be stored by a browser or intermediary cache.
app.use('/api', (req, res, next) => {
  const isReadRequest = req.method === 'GET' || req.method === 'HEAD';
  const isPrivateRoute =
    req.path === '/health' ||
    req.path === '/settings' ||
    req.path === '/companies/all' ||
    req.path.startsWith('/auth');

  if (!isReadRequest || isPrivateRoute) {
    res.set('Cache-Control', 'no-store, max-age=0');
  } else {
    res.set(
      'Cache-Control',
      'public, max-age=0, s-maxage=300, stale-while-revalidate=60'
    );
  }

  res.vary('Origin');
  next();
});

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), system: 'Linkup Central CMS API' });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/companies', require('./routes/companies'));
app.use('/api/services', require('./routes/services'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/testimonials', require('./routes/testimonials'));
app.use('/api/faqs', require('./routes/faqs'));
app.use('/api/blogs', require('./routes/blogs'));
app.use('/api/case-studies', require('./routes/caseStudies'));
app.use('/api/seo', require('./routes/seo'));
app.use('/api/settings', require('./routes/settings')); 
app.use('/api/upload', require('./routes/upload'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Express Error Handler:', err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Linkup Group CMS Express Backend listening on port ${PORT}`);
});
