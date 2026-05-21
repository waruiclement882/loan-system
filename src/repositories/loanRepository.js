const pool = require('../db/connection');

const create = async (loan) => {
  const { customer_id, amount, term_weeks, interest_amount, total_amount, created_by } = loan;
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

// Generate weekly repayment schedule starting from disbursement date
const generateSchedule = async (client, loanId, totalAmount, termWeeks, disbursedAt) => {
  // Delete any existing schedule for this loan
  await client.query('DELETE FROM repayment_schedules WHERE loan_id=$1', [loanId]);

  const weeklyAmount = Math.ceil(totalAmount / termWeeks); // round up
  let runningBalance = totalAmount;
  const startDate = new Date(disbursedAt);

  for (let i = 1; i <= termWeeks; i++) {
    const dueDate = new Date(startDate);
    dueDate.setDate(dueDate.getDate() + (i * 7)); // every 7 days

    // Last installment: pay whatever remains to avoid rounding issues
    const amountDue = i === termWeeks
      ? parseFloat(runningBalance.toFixed(2))
      : weeklyAmount;

    runningBalance = parseFloat((runningBalance - amountDue).toFixed(2));
    if (runningBalance < 0) runningBalance = 0;

    await client.query(
      `INSERT INTO repayment_schedules (loan_id, installment_no, due_date, amount_due, balance, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')`,
      [loanId, i, dueDate.toISOString().split('T')[0], amountDue, Math.max(0, runningBalance)]
    );
  }
};

const disburse = async (id, disbursed_by) => {
  const loanRes = await pool.query('SELECT * FROM loans WHERE id=$1', [id]);
  if (loanRes.rows.length === 0) return null;
  const loan = loanRes.rows[0];

  if (!loan.processing_fee_paid) {
    throw new Error('Processing fee of KSh ' + loan.processing_fee + ' must be paid before disbursement');
  }
  if (loan.status !== 'approved') return null;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const r = await client.query(
      'UPDATE loans SET status=$1, disbursed_by=$2, disbursed_at=NOW(), balance=amount WHERE id=$3 RETURNING *',
      ['active', disbursed_by, id]
    );
    const updatedLoan = r.rows[0];

    // Generate repayment schedule from today
    await generateSchedule(
      client,
      id,
      parseFloat(updatedLoan.total_amount),
      updatedLoan.term_weeks,
      new Date()
    );

    await client.query('COMMIT');
    return updatedLoan;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

const getSchedule = async (loanId) => {
  const r = await pool.query(
    'SELECT * FROM repayment_schedules WHERE loan_id=$1 ORDER BY installment_no',
    [loanId]
  );
  return r.rows;
};

// Called when a payment comes in — updates schedule installments
const applyPaymentToSchedule = async (loanId, amountPaid) => {
  const installments = await pool.query(
    "SELECT * FROM repayment_schedules WHERE loan_id=$1 AND status != 'paid' ORDER BY installment_no",
    [loanId]
  );

  let remaining = parseFloat(amountPaid);
  for (const inst of installments.rows) {
    if (remaining <= 0) break;
    const due     = parseFloat(inst.amount_due);
    const already = parseFloat(inst.amount_paid || 0);
    const owed    = due - already;

    if (remaining >= owed) {
      // Full payment of this installment
      await pool.query(
        "UPDATE repayment_schedules SET amount_paid=$1, status='paid', paid_at=NOW() WHERE id=$2",
        [due, inst.id]
      );
      remaining -= owed;
    } else {
      // Partial payment
      await pool.query(
        "UPDATE repayment_schedules SET amount_paid=$1, status='partial' WHERE id=$2",
        [already + remaining, inst.id]
      );
      remaining = 0;
    }
  }

  // Mark overdue installments
  await pool.query(
    "UPDATE repayment_schedules SET status='overdue' WHERE loan_id=$1 AND due_date < NOW() AND status='pending'",
    [loanId]
  );
};

const updateStatus = async (id, status) => {
  const r = await pool.query('UPDATE loans SET status=$1 WHERE id=$2 RETURNING *', [status, id]);
  return r.rows[0];
};

module.exports = { create, getAll, getById, approve, reject, disburse, updateStatus, markProcessingFeePaid, getSchedule, applyPaymentToSchedule };
