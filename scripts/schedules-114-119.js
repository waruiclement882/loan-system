require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const loans = [
  { id: 114, total: 18752, weekly: 4688, weeks: 4 },
  { id: 115, total: 12000, weekly: 3000, weeks: 4 },
  { id: 116, total: 12000, weekly: 3000, weeks: 4 },
  { id: 117, total: 6500,  weekly: 1300, weeks: 5 },
  { id: 118, total: 10002, weekly: 1667, weeks: 6 },
  { id: 119, total: 10002, weekly: 1667, weeks: 6 },
];

const disbursedAt = new Date('2026-09-29T06:00:00.000Z'); // 09:00 EAT = 06:00 UTC

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Delete any existing schedules
    const ids = loans.map(l => l.id);
    await client.query(`DELETE FROM repayment_schedules WHERE loan_id = ANY($1)`, [ids]);

    let totalRows = 0;

    for (const loan of loans) {
      let balance = loan.total;
      for (let i = 1; i <= loan.weeks; i++) {
        const due = new Date(disbursedAt);
        due.setDate(due.getDate() + i * 7);

        // Last week: pay whatever remains to avoid rounding issues
        const amount = i === loan.weeks
          ? parseFloat(balance.toFixed(2))
          : loan.weekly;

        balance = parseFloat((balance - amount).toFixed(2));
        if (balance < 0) balance = 0;

        await client.query(`
          INSERT INTO repayment_schedules
            (loan_id, installment_no, due_date, amount_due, amount_paid, balance, status)
          VALUES ($1, $2, $3, $4, 0, $5, 'pending')`,
          [loan.id, i, due.toISOString().split('T')[0], amount, balance]
        );
        totalRows++;
      }
      console.log(`✅ Loan #${loan.id} — ${loan.weeks} weeks scheduled`);
    }

    // Update loan balances
    for (const loan of loans) {
      await client.query(
        `UPDATE loans SET balance = total_amount WHERE id = $1`,
        [loan.id]
      );
    }

    await client.query('COMMIT');
    console.log(`\n✅ ${totalRows} schedule rows created across 6 loans`);

    // Verify
    console.log('\n=== SCHEDULE PREVIEW ===');
    const preview = await pool.query(`
      SELECT rs.loan_id, rs.installment_no, rs.due_date, rs.amount_due, rs.balance
      FROM repayment_schedules rs
      WHERE rs.loan_id = ANY($1)
      ORDER BY rs.loan_id, rs.installment_no
    `, [ids]);
    console.table(preview.rows);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
