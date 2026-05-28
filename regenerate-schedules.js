const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://microfinance_dqkt_user:ctTkm0GUXhI78h09ruijFiLdzRnE9i3e@dpg-d83m6hegvqtc73c7eia0-a.oregon-postgres.render.com/microfinance_dqkt',
  ssl: { rejectUnauthorized: false }
});

const regenerateSchedule = async (loanId, totalAmount, termWeeks, disbursedAt) => {
  // Delete existing
  await pool.query('DELETE FROM repayment_schedules WHERE loan_id=$1', [loanId]);

  const weeklyAmount = Math.ceil(totalAmount / termWeeks);
  let runningBalance = totalAmount;
  const start = new Date(disbursedAt);

  for (let i = 1; i <= termWeeks; i++) {
    const due = new Date(start);
    due.setDate(due.getDate() + (i * 7));

    const amt = i === termWeeks ? parseFloat(runningBalance.toFixed(2)) : weeklyAmount;
    runningBalance = parseFloat((runningBalance - amt).toFixed(2));
    if (runningBalance < 0) runningBalance = 0;

    await pool.query(
      `INSERT INTO repayment_schedules (loan_id, installment_no, due_date, amount_due, amount_paid, balance, status)
       VALUES ($1, $2, $3, $4, 0, $5, 'pending')`,
      [loanId, i, due.toISOString().split('T')[0], amt, runningBalance]
    );
  }
};

const applyPayments = async (loanId) => {
  const payments = await pool.query(
    'SELECT SUM(amount) as total FROM payments WHERE loan_id=$1', [loanId]
  );
  const total = parseFloat(payments.rows[0]?.total || 0);
  if (total <= 0) return;

  const installments = await pool.query(
    "SELECT * FROM repayment_schedules WHERE loan_id=$1 ORDER BY installment_no", [loanId]
  );

  let remaining = total;
  for (const inst of installments.rows) {
    if (remaining <= 0) break;
    const due = parseFloat(inst.amount_due);

    if (remaining >= due) {
      await pool.query(
        "UPDATE repayment_schedules SET amount_paid=$1, status='paid', paid_at=NOW() WHERE id=$2",
        [due, inst.id]
      );
      remaining -= due;
    } else {
      await pool.query(
        "UPDATE repayment_schedules SET amount_paid=$1, status='partial' WHERE id=$2",
        [remaining, inst.id]
      );
      remaining = 0;
    }
  }
};

const run = async () => {
  try {
    // Get ALL active/paid loans
    const loans = await pool.query(`
      SELECT id, total_amount, term_weeks, disbursed_at
      FROM loans
      WHERE status IN ('active', 'paid')
      AND term_weeks IS NOT NULL
      AND total_amount IS NOT NULL
      AND disbursed_at IS NOT NULL
    `);

    console.log('Regenerating schedules for', loans.rows.length, 'loans...');

    for (const loan of loans.rows) {
      await regenerateSchedule(loan.id, parseFloat(loan.total_amount), loan.term_weeks, loan.disbursed_at);
      await applyPayments(loan.id);
      console.log(`✓ Loan #${loan.id} done`);
    }

    // Mark overdue
    await pool.query(
      "UPDATE repayment_schedules SET status='overdue' WHERE due_date < NOW() AND status='pending'"
    );

    console.log('✓ Overdue marked');
    console.log('All done!');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
};

run();
