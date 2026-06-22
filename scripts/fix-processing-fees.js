require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

function getProcessingFee(amount) {
  const amt = parseFloat(amount);
  if (amt < 10000) return 700;
  if (amt === 10000) return 800;
  return 950; // above 10000
}

async function fix() {
  const client = await pool.connect();
  try {
    // Get all loans
    const loansResult = await client.query('SELECT id, amount, processing_fee_paid FROM loans ORDER BY id ASC');
    const loans = loansResult.rows;

    console.log('\n=== PROCESSING FEE BACKFILL ===');
    console.log(`Found ${loans.length} loans to process\n`);

    await client.query('BEGIN');

    let totalFees = 0;
    for (const loan of loans) {
      const fee = getProcessingFee(loan.amount);
      totalFees += fee;
      const txCode = `BACKFILL-FEE-LOAN-${loan.id}`;

      // 1. Update loan processing_fee_paid and processing_fee
      await client.query(
        `UPDATE loans 
         SET processing_fee_paid = TRUE, 
             processing_fee = $1,
             processing_fee_transaction = $2,
             processing_fee_paid_at = created_at
         WHERE id = $3`,
        [fee, txCode, loan.id]
      );

      // 2. Insert into company_income
      await client.query(
        `INSERT INTO company_income (loan_id, amount, type, transaction_code, notes, created_at)
         SELECT $1, $2, 'processing_fee', $3, $4, created_at
         FROM loans WHERE id = $1`,
        [loan.id, fee, txCode, `Backfilled processing fee for loan #${loan.id} - KSh ${loan.amount} principal`]
      );

      console.log(`✅ Loan #${loan.id} | Principal: KSh ${loan.amount} | Fee: KSh ${fee}`);
    }

    await client.query('COMMIT');

    console.log(`\n=== SUMMARY ===`);
    console.log(`Total loans updated: ${loans.length}`);
    console.log(`Total processing fees recorded: KSh ${totalFees.toLocaleString()}`);

    // Verify
    console.log('\n=== VERIFICATION ===');
    const verify = await pool.query(`
      SELECT l.id, l.amount, l.processing_fee, l.processing_fee_paid, ci.amount as income_recorded
      FROM loans l
      LEFT JOIN company_income ci ON ci.loan_id = l.id AND ci.type = 'processing_fee'
      ORDER BY l.id
    `);
    console.table(verify.rows);

    // Show corrected monthly breakdown
    console.log('\n=== CORRECTED MONTHLY BREAKDOWN (EAT timezone) ===');
    const monthly = await pool.query(`
      SELECT 
        TO_CHAR((created_at AT TIME ZONE 'Africa/Nairobi'), 'Month YYYY') as month,
        COUNT(*) as loans_disbursed,
        SUM(amount) as amount_disbursed,
        SUM(processing_fee) as processing_fees
      FROM loans
      GROUP BY DATE_TRUNC('month', created_at AT TIME ZONE 'Africa/Nairobi'),
               TO_CHAR((created_at AT TIME ZONE 'Africa/Nairobi'), 'Month YYYY')
      ORDER BY DATE_TRUNC('month', created_at AT TIME ZONE 'Africa/Nairobi') ASC
    `);
    console.table(monthly.rows);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error - rolled back:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

fix();
