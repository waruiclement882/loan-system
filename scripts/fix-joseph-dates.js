require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function fix() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Fix loan dates
    await client.query(`
      UPDATE loans SET
        disbursed_at = '2026-04-30T08:00:00.000Z',
        created_at   = '2026-04-30T08:00:00.000Z',
        closed_at    = '2026-05-18T08:00:00.000Z',
        processing_fee_paid_at = '2026-04-30T08:00:00.000Z'
      WHERE id = 15
    `);
    console.log('✅ Loan #15 dates fixed');

    // Fix repayment schedule due dates
    await client.query(`
      UPDATE repayment_schedules SET
        due_date = due_date + INTERVAL '1 year',
        paid_at  = '2026-05-18T08:00:00.000Z'
      WHERE loan_id = 15
    `);
    console.log('✅ Schedule due dates fixed');

    // Fix payment dates
    await client.query(`
      UPDATE payments SET
        payment_date = '2026-05-18T08:00:00.000Z'
      WHERE loan_id = 15
    `);
    console.log('✅ Payment dates fixed');

    // Fix company_income date
    await client.query(`
      UPDATE company_income SET
        created_at = '2026-04-30T08:00:00.000Z'
      WHERE loan_id = 15
    `);
    console.log('✅ Company income date fixed');

    await client.query('COMMIT');

    // Verify
    console.log('\n=== VERIFICATION ===');
    const loan = await pool.query('SELECT id, status, disbursed_at, closed_at FROM loans WHERE id = 15');
    console.table(loan.rows);

    const sched = await pool.query('SELECT installment_no, due_date, status, paid_at FROM repayment_schedules WHERE loan_id = 15 ORDER BY installment_no');
    console.table(sched.rows);

    const pays = await pool.query('SELECT amount, payment_date, source FROM payments WHERE loan_id = 15');
    console.table(pays.rows);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

fix();
