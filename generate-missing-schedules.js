require('dotenv').config();
const pool = require('./src/db/connection');

const generateSchedule = async (loanId, totalAmount, termWeeks, disbursedAt) => {
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
  console.log(`✓ Generated ${termWeeks}-week schedule for loan #${loanId}`);
};

const run = async () => {
  try {
    // Loan 58 - Enock mwebi - KSh 7,000 - 6 weeks - disbursed 2026-08-08
    await generateSchedule(58, 10002, 6, '2026-08-08T06:00:00.000Z');

    // Loan 59 - Jaliding kerubo - KSh 15,000 - 4 weeks - disbursed 2026-07-23
    await generateSchedule(59, 18752, 4, '2026-07-23T06:00:00.000Z');

    // Mark overdue
    await pool.query(
      "UPDATE repayment_schedules SET status='overdue' WHERE loan_id IN (58,59) AND due_date < NOW() AND status='pending'"
    );
    console.log('✓ Overdue marked');

    // Verify
    const result = await pool.query(
      'SELECT loan_id, installment_no, due_date, amount_due, balance, status FROM repayment_schedules WHERE loan_id IN (58,59) ORDER BY loan_id, installment_no'
    );
    console.log('\nGenerated schedules:');
    result.rows.forEach(r => {
      console.log(`Loan #${r.loan_id} | Week ${r.installment_no} | Due: ${r.due_date.toISOString().split('T')[0]} | KSh ${r.amount_due} | Balance: ${r.balance} | ${r.status}`);
    });

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
};

run();
