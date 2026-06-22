require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Running suspense migration...');

    // Overpayment flags on payments
    await client.query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS is_overpayment BOOLEAN DEFAULT FALSE`);
    await client.query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS overpayment_amount NUMERIC(12,2) DEFAULT 0`);
    await client.query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS overpayment_status VARCHAR(20) DEFAULT 'none'`);
    console.log('✅ Overpayment columns added to payments');

    // Suspense account table
    await client.query(`
      CREATE TABLE IF NOT EXISTS suspense_account (
        id                SERIAL PRIMARY KEY,
        customer_id       INTEGER REFERENCES customers(id),
        loan_id           INTEGER REFERENCES loans(id),
        payment_id        INTEGER REFERENCES payments(id),
        amount            NUMERIC(12,2) NOT NULL,
        type              VARCHAR(20) NOT NULL CHECK (type IN ('credit','debit')),
        use_case          VARCHAR(30),
        notes             TEXT,
        recorded_by       INTEGER REFERENCES users(id),
        created_at        TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ suspense_account table created');

    // Overpayment review queue
    await client.query(`
      CREATE TABLE IF NOT EXISTS overpayment_review (
        id                SERIAL PRIMARY KEY,
        payment_id        INTEGER REFERENCES payments(id),
        customer_id       INTEGER REFERENCES customers(id),
        loan_id           INTEGER REFERENCES loans(id),
        overpayment_amount NUMERIC(12,2) NOT NULL,
        status            VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
        reviewed_by       INTEGER REFERENCES users(id),
        reviewed_at       TIMESTAMP,
        notes             TEXT,
        created_at        TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ overpayment_review table created');

    // Verify
    console.log('\n=== TABLES CREATED ===');
    const tables = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('suspense_account','overpayment_review')
    `);
    console.table(tables.rows);

    console.log('\n✅ Suspense migration complete');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
