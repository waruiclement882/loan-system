const express = require('express');

const customerRoutes = require('./src/routes/customers');
const loanRoutes = require('./src/routes/loans');
const paymentRoutes = require('./src/routes/payments');
const mpesaRoutes = require('./src/routes/mpesa');
const authRoutes = require('./src/routes/auth');

const app = express();

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Microfinance server is running');
});

app.use('/api/customers', customerRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/mpesa', mpesaRoutes);
app.use('/api/auth', authRoutes);

module.exports = app;