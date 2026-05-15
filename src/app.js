const express = require('express');

const customerRoutes = require('./routes/customers');
const loanRoutes = require('./routes/loans');
const paymentRoutes = require('./routes/payments');
const mpesaRoutes = require('./routes/mpesa');
const authRoutes = require('./routes/auth');

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