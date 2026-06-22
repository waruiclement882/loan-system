require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function migrate() {
  try {
    console.log('Adding closed_at column to loans table...');

    // Add closed_at column if it doesn't exist
    await pool.query(`
      ALTER TABLE loans
      ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP
    `);
    console.log('✅ closed_at column added');

    // Add total_repayment column if it doesn't exist
    await pool.query(`
      ALTER TABLE loans
      ADD COLUMN IF NOT EXISTS total_repayment NUMERIC(12,2)
    `);
    console.log('✅ total_repayment column ready');

    // Backfill closed_at and total_repayment for already-paid loans
    const paid = await pool.query(`
      SELECT l.id, l.total_amount,
        COALESCE(SUM(p.amount), 0) AS total_paid,
        MAX(p.payment_date) AS last_payment
      FROM loans l
      LEFT JOIN payments p ON p.loan_id = l.id
      WHERE l.status = 'paid'
      GROUP BY l.id
    `);

    for (const loan of paid.rows) {
      await pool.query(`
        UPDATE loans
        SET closed_at = $1,
            total_repayment = $2,
            balance = 0
        WHERE id = $3
      `, [loan.last_payment || new Date(), loan.total_paid, loan.id]);

      // Also mark all schedule rows as paid
      await pool.query(`
        UPDATE repayment_schedules
        SET status = 'paid', amount_paid = amount_due, paid_at = $1
        WHERE loan_id = $2 AND status != 'paid'
      `, [loan.last_payment || new Date(), loan.id]);

      console.log(`✅ Loan #${loan.id} backfilled — closed_at set, total_repayment: KSh ${loan.total_paid}`);
    }

    // Final check
    const result = await pool.query(`
      SELECT id, status, balance, total_repayment, closed_at
      FROM loans WHERE status = 'paid'
    `);
    console.log('\n=== PAID LOANS AFTER MIGRATION ===');
    console.table(result.rows);

    console.log('\n✅ Migration complete');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    await pool.end();
  }
}

migrate();
