require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function diagnose() {
  try {
    console.log('\n=== LOANS TABLE COLUMNS ===');
    const cols = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'loans'");
    console.table(cols.rows);

    console.log('\n=== COMPANY_INCOME COLUMNS ===');
    const incCols = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'company_income'");
    console.table(incCols.rows);

    console.log('\n=== LOANS WITH EAT DATES ===');
    const loans = await pool.query(`
      SELECT id, amount, balance, status, processing_fee_paid,
        (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Nairobi')::date as disbursed_date_EAT,
        created_at as disbursed_date_UTC
      FROM loans ORDER BY created_at ASC
    `);
    console.table(loans.rows);

    console.log('\n=== PRICING / PROCESSING FEE CONFIG ===');
    try {
      const pricing = await pool.query('SELECT * FROM pricing_plans LIMIT 20');
      console.table(pricing.rows);
    } catch(e) {
      try {
        const pricing2 = await pool.query('SELECT * FROM pricing LIMIT 20');
        console.table(pricing2.rows);
      } catch(e2) {
        console.log('No pricing table found:', e2.message);
      }
    }

    console.log('\n=== PAYMENTS PER LOAN ===');
    const payments = await pool.query(`
      SELECT loan_id, COUNT(*) as payment_count, SUM(amount) as total_paid
      FROM payments GROUP BY loan_id ORDER BY loan_id
    `);
    console.table(payments.rows);

  } catch(err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

diagnose();
