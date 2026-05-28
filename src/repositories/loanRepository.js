const pool = require('../db/connection');

const create = async (loan) => {
  const { customer_id, amount, term_weeks, interest_amount, total_amount, created_by } = loan;
  const r = await pool.query(
    'INSERT INTO loans (customer_id,amount,term_weeks,interest_amount,total_amount,balance,status,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
    [customer_id, amount, term_weeks, interest_amount, total_amount, total_amount, 'pending', created_by || null]
  );
  return r.rows[0];
};

const getAll = async (status) => {
  let q = `SELECT loans.*, customers.name as customer_name, customers.phone as customer_phone,
    u1.name as created_by_name, u2.name as approved_by_name
    FROM loans
    LEFT JOIN customers ON loans.customer_id = customers.id
    LEFT JOIN users u1 ON loans.created_by = u1.id
    LEFT JOIN users u2 ON loans.approved_by = u2.id`;
  const p = [];
  if (status) { q += ' WHERE loans.status = $1'; p.push(status); }
  q += ' ORDER BY loans.id DESC';
  return (await pool.query(q, p)).rows;
};

const getById = async (id) => {
  const r = await pool.query(
    'SELECT loans.*, customers.name as customer_name, customers.phone as customer_phone FROM loans LEFT JOIN customers ON loans.customer_id = customers.id WHERE loans.id = $1',
    [id]
  );
  return r.rows[0];
};

const approve = async (id, approved_by) => {
  const r = await pool.query(
    'UPDATE loans SET status=$1, approved_by=$2, approved_at=NOW() WHERE id=$3 AND status=$4 RETURNING *',
    ['approved', approved_by, id, 'pending']
  );
  return r.rows[0];
};

const reject = async (id, rejected_by, reason) => {
  const r = await pool.query(
    'UPDATE loans SET status=$1, approved_by=$2, approved_at=NOW(), rejection_reason=$3 WHERE id=$4 AND status=$5 RETURNING *',
    ['rejected', rejected_by, reason, id, 'pending']
  );
  return r.rows[0];
};

const disburse = async (id, disbursed_by) => {
  const r = await pool.query(
    'UPDATE loans SET status=$1, disbursed_by=$2, disbursed_at=NOW(), balance=total_amount WHERE id=$3 AND status=$4 RETURNING *',
    ['active', disbursed_by, id, 'approved']
  );
  return r.rows[0];
};

const updateStatus = async (id, status) => {
  const r = await pool.query(
    'UPDATE loans SET status=$1 WHERE id=$2 RETURNING *',
    [status, id]
  );
  return r.rows[0];
};

module.exports = { create, getAll, getById, approve, reject, disburse, updateStatus, markProcessingFeePaid, getSchedule, applyPaymentToSchedule };