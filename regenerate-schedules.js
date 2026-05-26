require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const generateSchedule = async (loanId) => {
  const loanResult = await pool.query('SELECT * FROM loans WHERE id = $1', [loanId]);
  if (loanResult.rows.length === 0) { console.log(`Loan ${loanId} not found`); return; }
  const loan = loanResult.rows[0];
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
  console.log(`✅ Loan ${loanId} — disbursed ${new Date(disbursedAt).toISOString().split('T')[0]} — ${termWeeks} weeks, KSh ${weeklyAmount}/week`);
};

const run = async () => {
  try {
    for (let i = 1; i <= 9; i++) {
      await generateSchedule(i);
    }
    console.log('\n🎉 All schedules regenerated!');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
};

run();