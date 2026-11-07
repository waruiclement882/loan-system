require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const feePaidLoans = [
  { id: 114, customer_id: 18,  fee: 1050 },
  { id: 116, customer_id: 30,  fee: 800  },
  { id: 117, customer_id: 68,  fee: 700  },
  { id: 118, customer_id: 70,  fee: 700  },
  { id: 119, customer_id: 69,  fee: 700  },
];
// Loan 115 (Henry Hilda) — fee = 0, skip

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const loan of feePaidLoans) {
      const txCode = `FEE-LOAN-${loan.id}-SEP2026`;

      // Mark loan processing fee as paid
      await client.query(`
        UPDATE loans SET
          processing_fee_paid = TRUE,
          processing_fee_paid_at = '2026-09-29T06:00:00.000Z',
          processing_fee_transaction = $1
        WHERE id = $2
      `, [txCode, loan.id]);

      // Record in company_income
      await client.query(`
        INSERT INTO company_income (loan_id, amount, type, transaction_code, notes, created_at)
        VALUES ($1, $2, 'processing_fee', $3, $4, '2026-09-29T06:00:00.000Z')
        ON CONFLICT DO NOTHING
      `, [loan.id, loan.fee, txCode, `Processing fee — Loan #${loan.id} disbursed 29 Sep 2026`]);

      console.log(`✅ Loan #${loan.id} — processing fee KSh ${loan.fee} marked paid`);
    }

    // Loan 115 — no fee
    await client.query(`UPDATE loans SET processing_fee_paid = TRUE WHERE id = 115`);
    console.log(`✅ Loan #115 — no processing fee (waived)`);

    await client.query('COMMIT');

    // Verify
    console.log('\n=== PROCESSING FEE STATUS ===');
    const verify = await pool.query(`
      SELECT l.id, c.name, l.amount, l.processing_fee, l.processing_fee_paid, l.processing_fee_paid_at
      FROM loans l JOIN customers c ON l.customer_id = c.id
      WHERE l.id IN (114,115,116,117,118,119)
      ORDER BY l.id
    `);
    console.table(verify.rows);

    console.log('\n=== COMPANY INCOME (Sep 2026) ===');
    const income = await pool.query(`
      SELECT ci.loan_id, c.name, ci.amount, ci.type, ci.transaction_code
      FROM company_income ci JOIN loans l ON ci.loan_id = l.id JOIN customers c ON l.customer_id = c.id
      WHERE ci.loan_id IN (114,115,116,117,118,119)
      ORDER BY ci.loan_id
    `);
    console.table(income.rows);

    const total = feePaidLoans.reduce((s, l) => s + l.fee, 0);
    console.log(`\nTotal fees recorded: KSh ${total.toLocaleString()}`);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
