const pool = require('../db/connection');

const create = async (loan) => {
  const { customer_id, amount, term_weeks, interest_amount, total_amount, created_by } = loan;
  // Get processing fee from pricing rules
  const rule = await pool.query(
    'SELECT processing_fee FROM loan_pricing_rules WHERE loan_amount=$1 AND term_weeks=$2',
    [amount, term_weeks]
  );
  const processing_fee = rule.rows[0]?.processing_fee || 0;
  const r = await pool.query(
    'INSERT INTO loans (customer_id,amount,term_weeks,interest_amount,total_amount,balance,status,created_by,processing_fee) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
    [customer_id, amount, term_weeks, interest_amount, total_amount, total_amount, 'pending', created_by || null, processing_fee]
  );
  return r.rows[0];
};

const getAll = async (status) => {
  let q = 'SELECT loans.*,customers.name as customer_name FROM loans LEFT JOIN customers ON loans.customer_id=customers.id';
  const p = [];
  if (status) { q += ' WHERE loans.status=$1'; p.push(status); }
  q += ' ORDER BY loans.id DESC';
  return (await pool.query(q, p)).rows;
};

const getById = async (id) => {
  const r = await pool.query(
    'SELECT loans.*,customers.name as customer_name FROM loans LEFT JOIN customers ON loans.customer_id=customers.id WHERE loans.id=$1',
    [id]
  );
  return r.rows[0];
};

const approve = async (id, approved_by) => {
  const r = await pool.query(
    'UPDATE loans SET status=$1,approved_by=$2,approved_at=NOW() WHERE id=$3 AND status=$4 RETURNING *',
    ['approved', approved_by, id, 'pending']
  );
  return r.rows[0];
};

const reject = async (id, rejected_by, reason) => {
  const r = await pool.query(
    'UPDATE loans SET status=$1,approved_by=$2,approved_at=NOW(),rejection_reason=$3 WHERE id=$4 AND status=$5 RETURNING *',
    ['rejected', rejected_by, reason, id, 'pending']
  );
  return r.rows[0];
};

const markProcessingFeePaid = async (id, transaction_code) => {
  const loan = await pool.query('SELECT * FROM loans WHERE id=$1', [id]);
  if (loan.rows.length === 0) throw new Error('Loan not found');
  if (loan.rows[0].processing_fee_paid) throw new Error('Processing fee already paid');
  const r = await pool.query(
    'UPDATE loans SET processing_fee_paid=true, processing_fee_paid_at=NOW(), processing_fee_transaction=$1 WHERE id=$2 RETURNING *',
    [transaction_code || 'MANUAL', id]
  );
  return r.rows[0];
};

const disburse = async (id, disbursed_by) => {
  const loan = await pool.query('SELECT * FROM loans WHERE id=$1', [id]);
  if (loan.rows.length === 0) return null;
  if (!loan.rows[0].processing_fee_paid) {
    throw new Error('Processing fee of KSh ' + loan.rows[0].processing_fee + ' must be paid before disbursement');
  }
  if (loan.rows[0].status !== 'approved') return null;
  const r = await pool.query(
    'UPDATE loans SET status=$1,disbursed_by=$2,disbursed_at=NOW(),balance=amount WHERE id=$3 RETURNING *',
    ['active', disbursed_by, id]
  );
  return r.rows[0];
};

const updateStatus = async (id, status) => {
  const r = await pool.query('UPDATE loans SET status=$1 WHERE id=$2 RETURNING *', [status, id]);
  return r.rows[0];
};

module.exports = { create, getAll, getById, approve, reject, disburse, updateStatus, markProcessingFeePaid };
