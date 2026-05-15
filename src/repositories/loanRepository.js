const pool = require('../db/connection');


// Create loan
const create = async (loan) => {
  const {
    loan_number,
    customer_id,
    principal,
    interest,
    total_due,
    balance,
    term_weeks
  } = loan;

  const result = await pool.query(`
    INSERT INTO loans (
      loan_number,
      customer_id,
      principal,
      interest,
      total_due,
      balance,
      term_weeks
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7)
    RETURNING *
  `, [
    loan_number,
    customer_id,
    principal,
    interest,
    total_due,
    balance,
    term_weeks
  ]);

  return result.rows[0];
};


// Get by loan number
const getByLoanNumber = async (loanNumber) => {
  const result = await pool.query(`
    SELECT *
    FROM loans
    WHERE loan_number = $1
  `, [loanNumber]);

  return result.rows[0];
};


// Update balance
const updateBalance = async (
  loanId,
  newBalance
) => {

  const result = await pool.query(`
    UPDATE loans
    SET balance = $1
    WHERE loan_id = $2
    RETURNING *
  `, [newBalance, loanId]);

  return result.rows[0];
};


module.exports = {
  create,
  getByLoanNumber,
  updateBalance
};