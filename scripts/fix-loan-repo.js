const fs = require('fs');

let content = fs.readFileSync('src/repositories/loanRepository.js', 'utf8');

// Add missing functions before module.exports
const missingFunctions = `
const markProcessingFeePaid = async (id, transaction_code) => {
  const r = await pool.query(
    'UPDATE loans SET processing_fee_paid=true, processing_fee_paid_at=NOW(), processing_fee_transaction=$1 WHERE id=$2 RETURNING *',
    [transaction_code || 'MANUAL', id]
  );
  return r.rows[0];
};

const getSchedule = async (loanId) => {
  const r = await pool.query(
    'SELECT * FROM repayment_schedules WHERE loan_id=$1 ORDER BY installment_no',
    [loanId]
  );
  return r.rows;
};

const applyPaymentToSchedule = async (loanId, amountPaid) => {
  const installments = await pool.query(
    "SELECT * FROM repayment_schedules WHERE loan_id=$1 AND status != 'paid' ORDER BY installment_no",
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

  // Mark overdue
  await pool.query(
    "UPDATE repayment_schedules SET status='overdue' WHERE loan_id=$1 AND due_date < NOW() AND status='pending'",
    [loanId]
  );
};

`;

// Insert before module.exports
content = content.replace(
  'module.exports = { create, getAll, getById, approve, reject, disburse, updateStatus, markProcessingFeePaid, getSchedule, applyPaymentToSchedule };',
  missingFunctions + 'module.exports = { create, getAll, getById, approve, reject, disburse, updateStatus, markProcessingFeePaid, getSchedule, applyPaymentToSchedule };'
);

fs.writeFileSync('src/repositories/loanRepository.js', content, 'utf8');
console.log('Functions added!');
