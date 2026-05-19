const pool = require('../db/connection');

const getAll = async () => {
  const result = await pool.query(`
    SELECT payments.*, loans.amount as loan_amount, customers.name as customer_name
    FROM payments
    LEFT JOIN loans ON payments.loan_id = loans.id
    LEFT JOIN customers ON loans.customer_id = customers.id
    ORDER BY payments.id DESC
  `);
  return result.rows;
};

const getByTransactionCode = async (transactionCode) => {
  const result = await pool.query(`
    SELECT * FROM payments WHERE transaction_code = $1
  `, [transactionCode]);
  return result.rows[0];
};

const create = async (payment) => {
  const { loan_id, amount, transaction_code, source } = payment;
  const result = await pool.query(`
    INSERT INTO payments (loan_id, amount, transaction_code, source)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `, [loan_id, amount, transaction_code, source]);
  return result.rows[0];
};

const getByLoanId = async (loanId) => {
  const result = await pool.query(`
    SELECT * FROM payments WHERE loan_id = $1 ORDER BY id DESC
  `, [loanId]);
  return result.rows;
};

module.exports = { getAll, getByTransactionCode, create, getByLoanId };