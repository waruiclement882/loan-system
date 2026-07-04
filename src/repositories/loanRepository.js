const pool = require('../db/connection');

const create = async (loan) => {
  const { customer_id, amount, term_weeks, interest_amount, total_amount, weekly_installment, created_by, branch_id } = loan;
  const r = await pool.query(
    'INSERT INTO loans (customer_id,amount,term_weeks,interest_amount,total_amount,weekly_installment,balance,status,created_by,branch_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *',
    [customer_id, amount, term_weeks, interest_amount, total_amount, weekly_installment || 0, total_amount, 'pending', created_by || null, branch_id || 1]
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
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const r = await client.query(
      'UPDATE loans SET status=$1, disbursed_by=$2, disbursed_at=NOW(), balance=total_amount WHERE id=$3 AND status=$4 RETURNING *',
      ['active', disbursed_by, id, 'approved']
    );

    if (!r.rows[0]) {
      await client.query('ROLLBACK');
      return null;
    }

    const loan = r.rows[0];

    // Auto-generate repayment schedule
    if (loan.term_weeks && loan.total_amount) {
      await client.query('DELETE FROM repayment_schedules WHERE loan_id=$1', [loan.id]);

      const totalAmount = parseFloat(loan.total_amount);
      const termWeeks = parseInt(loan.term_weeks);
      const weeklyAmount = Math.ceil(totalAmount / termWeeks);
      let runningBalance = totalAmount;
      const start = new Date(loan.disbursed_at || new Date());

      for (let i = 1; i <= termWeeks; i++) {
        const due = new Date(start);
        due.setDate(due.getDate() + (i * 7));
        const amt = i === termWeeks ? parseFloat(runningBalance.toFixed(2)) : weeklyAmount;
        runningBalance = parseFloat((runningBalance - amt).toFixed(2));
        if (runningBalance < 0) runningBalance = 0;

        await client.query(
          `INSERT INTO repayment_schedules (loan_id, installment_no, due_date, amount_due, amount_paid, balance, status)
           VALUES ($1, $2, $3, $4, 0, $5, 'pending')`,
          [loan.id, i, due.toISOString().split('T')[0], amt, runningBalance]
        );
      }
      console.log(`[Repo] Generated ${termWeeks}-week schedule for loan #${loan.id}`);
    }

    await client.query('COMMIT');
    return loan;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
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
const writeLoanOff = async (loanId, writtenOffBy, reason) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get loan details
    const loanRes = await client.query(
      'SELECT l.*, c.name as customer_name FROM loans l JOIN customers c ON l.customer_id = c.id WHERE l.id = $1',
      [loanId]
    );
    if (!loanRes.rows[0]) throw new Error('Loan not found');
    const loan = loanRes.rows[0];

    if (loan.status === 'written_off') throw new Error('Loan already written off');
    if (loan.status === 'paid') throw new Error('Cannot write off a paid loan');

    const balance = parseFloat(loan.balance || 0);

    // 1. Mark loan as written off
    await client.query(
      `UPDATE loans SET status = 'written_off', notes = $1 WHERE id = $2`,
      [`Written off: ${reason}`, loanId]
    );

    // 2. Mark all overdue/pending schedules as written_off
    await client.query(
      `UPDATE repayment_schedules SET status = 'written_off' WHERE loan_id = $1 AND status IN ('overdue','pending','partial')`,
      [loanId]
    );

    // 3. Record as Bad Debt expense
    await client.query(
      `INSERT INTO expenses (category, description, amount, payment_method, expense_date, recorded_by)
       VALUES ('Bad Debt', $1, $2, 'write_off', CURRENT_DATE, $3)`,
      [
        `Loan #${loanId} written off — ${loan.customer_name}. Reason: ${reason}`,
        balance,
        writtenOffBy
      ]
    );

    // 4. Audit log
    await client.query(
      'INSERT INTO audit_logs (user_id, user_name, action, entity, entity_id, details) VALUES ($1,$2,$3,$4,$5,$6)',
      [
        writtenOffBy, 'Admin', 'WRITE_OFF_LOAN', 'loans', loanId,
        JSON.stringify({ loan_id: loanId, balance, reason, customer: loan.customer_name })
      ]
    );

    await client.query('COMMIT');
    return { loan_id: loanId, balance_written_off: balance, customer: loan.customer_name };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

module.exports = {
  create, getAll, getById, approve, reject, disburse,
  updateStatus, markProcessingFeePaid, getSchedule,
  applyPaymentToSchedule, closeLoan, writeLoanOff
};
