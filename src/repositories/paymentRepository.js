const pool = require('../db/connection');


// Check duplicate transaction
const getByTransactionCode = async (
  transactionCode
) => {

  const result = await pool.query(`
    SELECT *
    FROM payments
    WHERE transaction_code = $1
  `, [transactionCode]);

  return result.rows[0];
};


// Create payment
const create = async (payment) => {

  const {
    loan_id,
    amount,
    transaction_code,
    source
  } = payment;

  const result = await pool.query(`
    INSERT INTO payments (
      loan_id,
      amount,
      transaction_code,
      source
    )
    VALUES ($1,$2,$3,$4)
    RETURNING *
  `, [
    loan_id,
    amount,
    transaction_code,
    source
  ]);

  return result.rows[0];
};


// Get payments by loan
const getByLoanId = async (
  loanId
) => {

  const result = await pool.query(`
    SELECT *
    FROM payments
    WHERE loan_id = $1
    ORDER BY payment_id DESC
  `, [loanId]);

  return result.rows;
};


module.exports = {
  getByTransactionCode,
  create,
  getByLoanId
};