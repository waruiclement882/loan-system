require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function fixDuplicates() {
  const client = await pool.connect();
  try {
    console.log('\n=== CHECKING DUPLICATES ===');
    const dupes = await client.query(`
      SELECT loan_id, COUNT(*) as count, SUM(amount) as total
      FROM company_income
      WHERE type = 'processing_fee'
      GROUP BY loan_id
      ORDER BY loan_id
    `);
    console.table(dupes.rows);

    console.log('\n=== REMOVING DUPLICATES (keeping earliest entry per loan) ===');
    await client.query('BEGIN');

    // Delete all but the earliest entry per loan_id
    const deleted = await client.query(`
      DELETE FROM company_income
      WHERE id NOT IN (
        SELECT MIN(id)
        FROM company_income
        WHERE type = 'processing_fee'
        GROUP BY loan_id
      )
      AND type = 'processing_fee'
    `);
    console.log(`Deleted ${deleted.rowCount} duplicate rows`);

    await client.query('COMMIT');

    // Final verification
    console.log('\n=== FINAL company_income STATE ===');
    const final = await client.query(`
      SELECT ci.id, ci.loan_id, ci.amount, ci.type, ci.transaction_code, ci.created_at::date
      FROM company_income ci
      ORDER BY ci.loan_id
    `);
    console.table(final.rows);

    console.log('\n=== FINAL TOTALS ===');
    const totals = await client.query(`
      SELECT 
        COUNT(*) as total_fees_collected,
        SUM(amount) as total_income
      FROM company_income
      WHERE type = 'processing_fee'
    `);
    console.table(totals.rows);

    console.log('\n=== MONTHLY BREAKDOWN WITH FEES ===');
    const monthly = await client.query(`
      SELECT 
        TO_CHAR((l.created_at AT TIME ZONE 'Africa/Nairobi'), 'Month YYYY') as month,
        COUNT(l.id) as loans_disbursed,
        SUM(l.amount) as amount_disbursed,
        SUM(ci.amount) as processing_fees
      FROM loans l
      LEFT JOIN company_income ci ON ci.loan_id = l.id AND ci.type = 'processing_fee'
      GROUP BY DATE_TRUNC('month', l.created_at AT TIME ZONE 'Africa/Nairobi'),
               TO_CHAR((l.created_at AT TIME ZONE 'Africa/Nairobi'), 'Month YYYY')
      ORDER BY DATE_TRUNC('month', l.created_at AT TIME ZONE 'Africa/Nairobi') ASC
    `);
    console.table(monthly.rows);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

fixDuplicates();
