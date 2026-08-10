const pool = require('../db/pool');

const generateSchedule = async (loanId) => {
  const loanResult = await pool.query('SELECT * FROM loans WHERE id = $1', [loanId]);
  if (loanResult.rows.length === 0) throw new Error('Loan not found');

  const loan = loanResult.rows[0];
  const termWeeks = parseInt(loan.term_weeks) || 6;
  const totalAmount = parseFloat(loan.total_amount) || 0;
  const weeklyAmount = parseFloat(loan.weekly_installment) || Math.round((totalAmount / termWeeks) * 100) / 100;
  const disbursedAt = loan.disbursed_at || new Date();

  await pool.query('DELETE FROM repayment_schedule WHERE loan_id = $1', [loanId]);

  for (let week = 1; week <= termWeeks; week++) {
    const dueDate = new Date(disbursedAt);
    dueDate.setDate(dueDate.getDate() + (week * 7));

    const amount = week === termWeeks
      ? Math.round((totalAmount - (weeklyAmount * (termWeeks - 1))) * 100) / 100
      : weeklyAmount;

    await pool.query(
      `INSERT INTO repayment_schedule (loan_id, installment_no, due_date, amount_due, amount_paid, status)
       VALUES ($1, $2, $3, $4, 0, 'pending')`,
      [loanId, week, dueDate.toISOString().split('T')[0], amount]
    );
  }

  console.log(`[Schedule] Generated ${termWeeks} weekly payments for loan ${loanId}`);
  return true;
};

const getSchedule = async (loanId) => {
  const result = await pool.query(
    'SELECT * FROM repayment_schedule WHERE loan_id = $1 ORDER BY installment_no ASC',
    [loanId]
  );
  return result.rows;
};

const applyPaymentToSchedule = async (loanId, amountPaid) => {
  const schedule = await pool.query(
    "SELECT * FROM repayment_schedule WHERE loan_id = $1 AND status != 'paid' ORDER BY installment_no ASC",
    [loanId]
  );

  let remaining = parseFloat(amountPaid);
  for (const row of schedule.rows) {
    if (remaining <= 0) break;
    const due = parseFloat(row.amount_due);
    const already = parseFloat(row.amount_paid || 0);
    const owed = due - already;

    if (remaining >= owed) {
      await pool.query(
        "UPDATE repayment_schedule SET amount_paid = amount_due, status = 'paid', paid_at = NOW() WHERE id = $1",
        [row.id]
      );
      remaining -= owed;
    } else {
      await pool.query(
        "UPDATE repayment_schedule SET amount_paid = amount_paid + $1, status = 'partial' WHERE id = $2",
        [remaining, row.id]
      );
      remaining = 0;
    }
  }

  await pool.query(
    "UPDATE repayment_schedule SET status = 'overdue' WHERE loan_id = $1 AND due_date < NOW() AND status = 'pending'",
    [loanId]
  );
};

module.exports = { generateSchedule, getSchedule, applyPaymentToSchedule };