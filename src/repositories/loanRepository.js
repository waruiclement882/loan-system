const pool = require('../db/connection');

const create = async (loan) => {
  const { customer_id, amount, interest_rate, term_months } = loan;

  const total_interest = amount * (interest_rate / 100) * (term_months / 12);
  const total_repayment = amount + total_interest;
  const monthly_payment = total_repayment / term_months;

  const result = await pool.query(`
    INSERT INTO loans 
      (customer_id, amount, interest_rate, term_months, total_interest, total_repayment, monthly_payment, status)
    VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
    RETURNING *
  `, [customer_id, amount, interest_rate, term_months, total_interest, total_repayment, monthly_payment]);

  return result.rows[0];
};

const getAll = async () => {
  const result = await pool.query(`
    SELECT loans.*, customers.name as customer_name 
    FROM loans 
    LEFT JOIN customers ON loans.customer_id = customers.id
    ORDER BY loans.id DESC
  `);
  return result.rows;
};

const getById = async (id) => {
  const result = await pool.query(`
    SELECT loans.*, customers.name as customer_name 
    FROM loans 
    LEFT JOIN customers ON loans.customer_id = customers.id
    WHERE loans.id = $1
  `, [id]);
  return result.rows[0];
};

const updateStatus = async (id, status) => {
  const result = await pool.query(`
    UPDATE loans SET status = $1 WHERE id = $2 RETURNING *
  `, [status, id]);
  return result.rows[0];
};

module.exports = { create, getAll, getById, updateStatus };