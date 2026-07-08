require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const run = async () => {
  try {
    const loans = await pool.query(`
      SELECT l.id, l.total_amount, l.term_weeks,
        COALESCE(SUM(p.amount),0) as total_paid
      FROM loans l
      LEFT JOIN payments p ON p.loan_id = l.id
      GROUP BY l.id, l.total_amount, l.term_weeks
      ORDER BY l.id
    `);

    for (const loan of loans.rows) {
      const weeklyAmount = parseFloat(loan.total_amount) / parseInt(loan.term_weeks);
      const weeksPaid = Math.floor(parseFloat(loan.total_paid) / weeklyAmount);

      // Reset all weeks
      await pool.query(`UPDATE repayment_schedule SET status='pending', amount_paid=0, paid_at=NULL WHERE loan_id=$1`, [loan.id]);

      // Mark overdue
      await pool.query(`UPDATE repayment_schedule SET status='overdue' WHERE loan_id=$1 AND due_date < NOW() AND status='pending'`, [loan.id]);

      if (weeksPaid > 0) {
        const schedule = await pool.query(
          `SELECT id, amount_due FROM repayment_schedule WHERE loan_id=$1 ORDER BY week_number ASC LIMIT $2`,
          [loan.id, weeksPaid]
        );
        for (const row of schedule.rows) {
          await pool.query(
            `UPDATE repayment_schedule SET status='paid', amount_paid=$1, paid_at=NOW() WHERE id=$2`,
            [row.amount_due, row.id]
          );
        }
      }
      console.log(`✅ Loan ${loan.id} — ${weeksPaid} weeks marked as paid`);
    }
    console.log('\n🎉 All schedule payments updated!');
  } catch (err) { console.error('Error:', err.message); }
  finally { await pool.end(); }
};
run();