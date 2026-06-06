const pool = require('../db/connection');

const create = async (loan) => {
  const { customer_id, amount, term_weeks, interest_amount, total_amount, weekly_installment, created_by } = loan;
  const r = await pool.query(
    'INSERT INTO loans (customer_id,amount,term_weeks,interest_amount,total_amount,weekly_installment,balance,status,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
    [customer_id, amount, term_weeks, interest_amount, total_amount, weekly_installment || 0, total_amount, 'pending', created_by || null]
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

const markProcessingFeePaid = async (id, transaction_code) => {
  const r = await pool.query(
    'UPDATE loans SET processing_fee_paid=true, processing_fee_paid_at=NOW(), processing_fee_transaction=$1 WHERE id=$2 RETURNING *',
    [transaction_code || 'MANUAL', id]
  );
  return r.rows[0];
};

const getSchedule = async (loanId) => {
  const r = await pool.query(
    'SELECT * FROM repayment_schedules WHERE loan_id=$1 ORDER BY installment_no ASC',
    [loanId]
  );
  return r.rows;
};

const applyPaymentToSchedule = async (loanId, amountPaid) => {
  const installments = await pool.query(
    "SELECT * FROM repayment_schedules WHERE loan_id=$1 AND status != 'paid' ORDER BY installment_no ASC",
    [loanId]
  );

  let remaining = parseFloat(amountPaid);
  for (const inst of installments.rows) {
    if (remaining <= 0) break;
    const due = parseFloat(inst.amount_due);
    const already = parseFloat(inst.amount_paid || 0);
    const owed = due - already;

    if (remaining >= owed) {
      await pool.query(
        "UPDATE repayment_schedules SET amount_paid=$1, status='paid', paid_at=NOW() WHERE id=$2",
        [due, inst.id]
      );
      remaining -= owed;
    } else {
      await pool.query(
        "UPDATE repayment_schedules SET amount_paid=$1, status='partial' WHERE id=$2",
        [already + remaining, inst.id]
      );
      remaining = 0;
    }
  }

  await pool.query(
    "UPDATE repayment_schedules SET status='overdue' WHERE loan_id=$1 AND due_date < NOW() AND status='pending'",
    [loanId]
  );
};

// ── Step 8: Loan Closure ──────────────────────────────────────────────────────
const closeLoan = async (loanId) => {
  // 1. Get total actually paid from payments table
  const paymentsResult = await pool.query(
    'SELECT COALESCE(SUM(amount), 0) AS total_paid FROM payments WHERE loan_id = $1',
    [loanId]
  );
  const totalPaid = parseFloat(paymentsResult.rows[0].total_paid);

  // 2. Mark loan as paid with closure timestamp and total_repayment
  const loanResult = await pool.query(
    `UPDATE loans
     SET status = 'paid',
         balance = 0,
         total_repayment = $1,
         closed_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [totalPaid, loanId]
  );

  // 3. Mark all remaining schedule rows as paid
  await pool.query(
    `UPDATE repayment_schedules
     SET status = 'paid',
         amount_paid = amount_due,
         paid_at = NOW()
     WHERE loan_id = $1 AND status != 'paid'`,
    [loanId]
  );

  console.log(`[Closure] Loan #${loanId} closed. Total repaid: KSh ${totalPaid}`);
  return loanResult.rows[0];
};

module.exports = {
  create, getAll, getById, approve, reject, disburse,
  updateStatus, markProcessingFeePaid, getSchedule,
  applyPaymentToSchedule, closeLoan
};
