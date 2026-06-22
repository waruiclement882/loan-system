const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://microfinance_dqkt_user:ctTkm0GUXhI78h09ruijFiLdzRnE9i3e@dpg-d83m6hegvqtc73c7eia0-a.oregon-postgres.render.com/microfinance_dqkt',
  ssl: { rejectUnauthorized: false }
});

const generateSchedule = async (client, loanId, totalAmount, termWeeks, disbursedAt) => {
  await client.query('DELETE FROM repayment_schedules WHERE loan_id=$1', [loanId]);
  const weeklyAmount = Math.ceil(totalAmount / termWeeks);
  let balance = totalAmount;
  const start = new Date(disbursedAt);

  for (let i = 1; i <= termWeeks; i++) {
    const due = new Date(start);
    due.setDate(due.getDate() + (i * 7));
    const amt = i === termWeeks ? parseFloat(balance.toFixed(2)) : weeklyAmount;
    balance = parseFloat((balance - amt).toFixed(2));
    if (balance < 0) balance = 0;

    await client.query(
      `INSERT INTO repayment_schedules (loan_id, installment_no, due_date, amount_due, amount_paid, balance, status)
       VALUES ($1, $2, $3, $4, 0, $5, 'pending')`,
      [loanId, i, due.toISOString().split('T')[0], amt, Math.max(0, balance)]
    );
  }
};

const run = async () => {
  const client = await pool.connect();
  try {
    // Get all active/paid loans missing schedules
    const loans = await pool.query(`
      SELECT loans.id, loans.total_amount, loans.term_weeks, loans.disbursed_at, loans.balance, loans.status
      FROM loans
      LEFT JOIN repayment_schedules rs ON loans.id = rs.loan_id
      WHERE loans.status IN ('active', 'paid')
      AND loans.term_weeks IS NOT NULL
      AND loans.total_amount IS NOT NULL
      AND loans.disbursed_at IS NOT NULL
      GROUP BY loans.id
      HAVING COUNT(rs.id) = 0
    `);

    console.log('Loans missing schedules:', loans.rows.length);

    for (const loan of loans.rows) {
      await client.query('BEGIN');
      try {
        await generateSchedule(client, loan.id, parseFloat(loan.total_amount), loan.term_weeks, loan.disbursed_at);
        await client.query('COMMIT');
        console.log(`✓ Generated schedule for loan #${loan.id}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`✗ Failed loan #${loan.id}:`, err.message);
      }
    }

    // Now apply existing payments to schedules
    const payments = await pool.query(`
      SELECT loan_id, SUM(amount) as total_paid
      FROM payments
      GROUP BY loan_id
    `);

    console.log('\nApplying payments to schedules...');
    for (const p of payments.rows) {
      try {
        // Get installments for this loan ordered by installment_no
        const installments = await pool.query(
          "SELECT * FROM repayment_schedules WHERE loan_id=$1 AND status != 'paid' ORDER BY installment_no",
          [p.loan_id]
        );

        let remaining = parseFloat(p.total_paid);
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
        console.log(`✓ Applied payments for loan #${p.loan_id}`);
      } catch (err) {
        console.error(`✗ Failed applying payments for loan #${p.loan_id}:`, err.message);
      }
    }

    // Mark overdue
    await pool.query(
      "UPDATE repayment_schedules SET status='overdue' WHERE due_date < NOW() AND status='pending'"
    );
    console.log('\n✓ Marked overdue installments');
    console.log('\nAll done!');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    client.release();
  }
};

run();
