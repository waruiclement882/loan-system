require('dotenv').config();
const pool = require('./src/db/connection');

const run = async () => {
  try {
    const [customers, loans, payments, disbursements] = await Promise.all([
      pool.query('SELECT COUNT(*) as total FROM customers'),
      pool.query(`SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status='active') as active,
        COUNT(*) FILTER (WHERE status='paid') as paid,
        COUNT(*) FILTER (WHERE status='pending') as pending,
        COALESCE(SUM(amount) FILTER (WHERE status IN ('active','paid')),0) as disbursed,
        COALESCE(SUM(balance) FILTER (WHERE status='active'),0) as outstanding
        FROM loans`),
      pool.query('SELECT COUNT(*) as total, COALESCE(SUM(amount),0) as collected FROM payments'),
      pool.query('SELECT COUNT(*) as total, COALESCE(SUM(amount),0) as total_amount FROM loans WHERE disbursed_at IS NOT NULL'),
    ]);

    console.log('=== DASHBOARD FIGURES ===');
    console.log('Customers:', customers.rows[0].total);
    console.log('Loans:', JSON.stringify(loans.rows[0], null, 2));
    console.log('Payments:', JSON.stringify(payments.rows[0], null, 2));
    console.log('Disbursements:', JSON.stringify(disbursements.rows[0], null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
};

run();
