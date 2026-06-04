const express = require('express');
const cors = require('cors');
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

const app = express();
app.use(cors());
app.use(express.json());

// Keepalive endpoint
app.get('/ping', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.get('/', (req, res) => res.send('Microfinance server is running'));

app.use('/api/customers', customerRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/mpesa', mpesaRoutes);
app.use('/api/auth', authRoutes);
app.use('/api', pricingRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api', usersRoutes);
app.use('/webhooks', webhookRoutes);

module.exports = app;