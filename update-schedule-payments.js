require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const markPaid = async (loanId, weeksCount) => {
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
    await markPaid(1, 3); // Siscar — 3 paid
    await markPaid(2, 2); // Vincent — 2 paid
    await markPaid(3, 3); // Lucy — 3 paid
    await markPaid(4, 4); // Salome — 4 paid
    await markPaid(5, 2); // Irene — 2 paid
    await markPaid(6, 1); // Rahab — 1 paid
    await markPaid(7, 0); // Ruth — 0 paid
    await markPaid(8, 0); // Joseph loan#8 — 0 paid
    await markPaid(9, 4); // Joseph loan#9 — fully paid
    console.log('\n🎉 All schedule payments updated!');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
};

run();