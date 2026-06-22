require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Running suspense fix migration...');

    // Add suspense_balance to customers
    await client.query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS suspense_balance NUMERIC(12,2) DEFAULT 0`);
    console.log('✅ suspense_balance added to customers');

    // pending_overpayments table (used by flagOverpaymentIfAny)
    await client.query(`
      CREATE TABLE IF NOT EXISTS pending_overpayments (
        id                    SERIAL PRIMARY KEY,
        loan_id               INTEGER REFERENCES loans(id),
        customer_id           INTEGER REFERENCES customers(id),
        payment_id            INTEGER REFERENCES payments(id),
        excess_amount         NUMERIC(12,2) NOT NULL,
        payment_amount        NUMERIC(12,2) NOT NULL,
        loan_balance_before   NUMERIC(12,2) NOT NULL,
        status                VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
        reviewed_by           INTEGER REFERENCES users(id),
        reviewed_at           TIMESTAMP,
        detected_at           TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ pending_overpayments table created');

    // suspense_transactions table (used by approveToSuspense & applySuspense)
    await client.query(`
      CREATE TABLE IF NOT EXISTS suspense_transactions (
        id                  SERIAL PRIMARY KEY,
        customer_id         INTEGER REFERENCES customers(id),
        type                VARCHAR(10) NOT NULL CHECK (type IN ('credit','debit')),
        amount              NUMERIC(12,2) NOT NULL,
        source              VARCHAR(50),
        related_loan_id     INTEGER REFERENCES loans(id),
        related_payment_id  INTEGER REFERENCES payments(id),
        recorded_by         INTEGER REFERENCES users(id),
        notes               TEXT,
        created_at          TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ suspense_transactions table created');

    // Verify all tables
    console.log('\n=== ALL SUSPENSE TABLES ===');
    const tables = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('pending_overpayments','suspense_transactions','suspense_account','overpayment_review')
      ORDER BY table_name
    `);
    console.table(tables.rows);

    // Verify suspense_balance column
    const col = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'customers' AND column_name = 'suspense_balance'
    `);
    console.log('\n=== CUSTOMERS.SUSPENSE_BALANCE ===');
    console.table(col.rows);

    console.log('\n✅ Suspense fix migration complete');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
