require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const generateSchedule = async (loanId) => {
  const loanResult = await pool.query('SELECT * FROM loans WHERE id = $1', [loanId]);
  if (loanResult.rows.length === 0) return;
  const loan = loanResult.rows[0];
  if (!['active', 'paid'].includes(loan.status)) return;

  const termWeeks = parseInt(loan.term_weeks) || 6;
  const totalAmount = parseFloat(loan.total_amount) || 0;
  const weeklyAmount = Math.round((totalAmount / termWeeks) * 100) / 100;
  const disbursedAt = loan.disbursed_at || loan.created_at || new Date();

  await pool.query('DELETE FROM repayment_schedule WHERE loan_id = $1', [loanId]);

  for (let week = 1; week <= termWeeks; week++) {
    const dueDate = new Date(disbursedAt);
    dueDate.setDate(dueDate.getDate() + (week * 7));
    const amount = week === termWeeks
      ? Math.round((totalAmount - (weeklyAmount * (termWeeks - 1))) * 100) / 100
      : weeklyAmount;
    await pool.query(
      `INSERT INTO repayment_schedule (loan_id, week_number, due_date, amount_due, status) VALUES ($1, $2, $3, $4, 'pending')`,
      [loanId, week, dueDate.toISOString().split('T')[0], amount]
    );
  }
  console.log(`✓ Loan #${loanId} done`);
};

const run = async () => {
  try {
    const loans = await pool.query(`SELECT id FROM loans WHERE status IN ('active','paid') ORDER BY id`);
    console.log(`Regenerating schedules for ${loans.rows.length} loans...`);
    for (const loan of loans.rows) await generateSchedule(loan.id);
    await pool.query(`UPDATE repayment_schedule SET status='overdue' WHERE due_date < NOW() AND status='pending'`);
    console.log('✓ Overdue marked\nAll done!');
  } catch (err) { console.error('Error:', err.message); }
  finally { await pool.end(); }
};
run();