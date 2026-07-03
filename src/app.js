const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const customerRoutes = require('./routes/customers');
const loanRoutes = require('./routes/loans');
const paymentRoutes = require('./routes/payments');
const mpesaRoutes = require('./routes/mpesa');
const authRoutes = require('./routes/auth');
const pricingRoutes = require('./routes/pricingRoutes');
const webhookRoutes = require('./routes/webhooks');
const settingsRoutes = require('./routes/settings');
const auditRoutes = require('./routes/audit');
const usersRoutes = require('./routes/users');
const reportsRoutes = require('./routes/reports');
const kycRoutes = require('./routes/kyc');
const suspenseRoutes = require('./routes/suspense');
const floatRoutes = require('./routes/float');
const expensesRoutes = require('./routes/expenses');
const branchRoutes = require('./routes/branches'); 

const app = express();
app.set('trust proxy', 1);

// ── 1. Security Headers ───────────────────────────────────────────────────────
app.use(helmet());

// ── 2. CORS — only allow your frontend ───────────────────────────────────────
const allowedOrigins = [
  'https://loan-frontend-xo0d.onrender.com',
  'http://localhost:3000',
  'http://localhost:3001'
];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// ── 3. Request size limit ─────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── 4. Rate limiting ──────────────────────────────────────────────────────────
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts, please try again in 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false
});

// ── 5. Health & ping — no rate limit ─────────────────────────────────────────
app.get('/ping', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));
app.get('/', (req, res) => res.send('Microfinance server is running'));

// ── 6. Webhooks — NO rate limit (KCB hits this repeatedly) ───────────────────
app.use('/webhooks', webhookRoutes);

// ── 7. Apply rate limits to API routes ───────────────────────────────────────
app.use('/api', generalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// ── 8. API Routes ─────────────────────────────────────────────────────────────
app.use('/api/customers', customerRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/mpesa', mpesaRoutes);
app.use('/api/auth', authRoutes);
app.use('/api', pricingRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api', usersRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/kyc', kycRoutes);
app.use('/api/suspense', suspenseRoutes);
app.use('/api/float', floatRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/branches', branchRoutes);


// ── 9. Global error handler ───────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Error]', err.message);
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'CORS: origin not allowed' });
  }
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});

module.exports = app;

