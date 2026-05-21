const pool = require('../db/connection');

const getAllCustomers = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM customers ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getCustomerById = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM customers WHERE id=$1', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Customer not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createCustomer = async (req, res) => {
  try {
    const { name, email, phone, national_id } = req.body;
    const result = await pool.query(
      'INSERT INTO customers (name, email, phone, national_id) VALUES ($1,$2,$3,$4) RETURNING *',
      [name, email, phone, national_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const updateCustomer = async (req, res) => {
  try {
    const { name, email, phone, national_id } = req.body;
    const result = await pool.query(
      'UPDATE customers SET name=$1, email=$2, phone=$3, national_id=$4 WHERE id=$5 RETURNING *',
      [name, email, phone, national_id, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Customer not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const getCustomerProfile = async (req, res) => {
  try {
    const { id } = req.params;

    // Get customer
    const customerRes = await pool.query('SELECT * FROM customers WHERE id=$1', [id]);
    if (!customerRes.rows[0]) return res.status(404).json({ error: 'Customer not found' });
    const customer = customerRes.rows[0];

    // Get all loans
    const loansRes = await pool.query(
      'SELECT * FROM loans WHERE customer_id=$1 ORDER BY id DESC', [id]
    );

    // Get all payments
    const paymentsRes = await pool.query(
      'SELECT payments.* FROM payments JOIN loans ON payments.loan_id = loans.id WHERE loans.customer_id=$1 ORDER BY payments.payment_date DESC',
      [id]
    );

    // Stats
    const totalBorrowed = loansRes.rows.reduce((s, l) => s + parseFloat(l.amount || 0), 0);
    const totalPaid = paymentsRes.rows.reduce((s, p) => s + parseFloat(p.amount || 0), 0);
    const totalOutstanding = loansRes.rows.reduce((s, l) => s + parseFloat(l.balance || 0), 0);
    const activeLoans = loansRes.rows.filter(l => l.status === 'active').length;
    const paidLoans = loansRes.rows.filter(l => l.status === 'paid').length;

    res.json({
      customer,
      loans: loansRes.rows,
      payments: paymentsRes.rows,
      stats: { totalBorrowed, totalPaid, totalOutstanding, activeLoans, paidLoans, totalLoans: loansRes.rows.length }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getAllCustomers, getCustomerById, createCustomer, updateCustomer, getCustomerProfile };
