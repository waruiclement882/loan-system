require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const markPaid = async (loanId, weeksCount) => {
  if (weeksCount === 0) {
    console.log(`✅ Loan ${loanId} — 0 weeks paid (skipped)`);
    return;
  }
  const schedule = await pool.query(
    'SELECT * FROM repayment_schedule WHERE loan_id = $1 ORDER BY week_number ASC',
    [loanId]
  );
  for (let i = 0; i < weeksCount && i < schedule.rows.length; i++) {
    const row = schedule.rows[i];
    await pool.query(
      `UPDATE repayment_schedule SET status = 'paid', amount_paid = amount_due, paid_at = $1 WHERE id = $2`,
      [row.due_date, row.id]
    );
  }
  console.log(`✅ Loan ${loanId} — ${weeksCount} weeks marked as paid`);
};

const run = async () => {
  try {
    // Get all active/paid loans with payment counts
    const loans = await pool.query(`
      SELECT l.id, l.status, COUNT(p.id) as payment_count,
             COALESCE(SUM(p.amount),0) as total_paid,
             l.total_amount, l.term_weeks
      FROM loans l
      LEFT JOIN payments p ON p.loan_id = l.id
      GROUP BY l.id, l.status, l.total_amount, l.term_weeks
      ORDER BY l.id
    `);

    for (const loan of loans.rows) {
      const weeklyAmount = parseFloat(loan.total_amount) / parseInt(loan.term_weeks);
      const weeksPaid = Math.floor(parseFloat(loan.total_paid) / weeklyAmount);
      await markPaid(loan.id, weeksPaid);
    }

    console.log('\n🎉 All schedule payments updated!');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
};

run();