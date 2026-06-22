require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Running KYC migration...');

    // Add kyc_verified to customers table
    await client.query(`
      ALTER TABLE customers
      ADD COLUMN IF NOT EXISTS kyc_verified BOOLEAN DEFAULT FALSE
    `);
    console.log('✅ kyc_verified column added to customers');

    // Create customer_documents table
    await client.query(`
      CREATE TABLE IF NOT EXISTS customer_documents (
        id                    SERIAL PRIMARY KEY,
        customer_id           INTEGER REFERENCES customers(id) ON DELETE CASCADE,
        national_id_url       TEXT,
        national_id_public_id TEXT,
        passport_photo_url    TEXT,
        passport_photo_public_id TEXT,
        kyc_verified          BOOLEAN DEFAULT FALSE,
        verified_by           INTEGER REFERENCES users(id),
        verified_at           TIMESTAMP,
        rejection_reason      TEXT,
        created_at            TIMESTAMP DEFAULT NOW(),
        updated_at            TIMESTAMP DEFAULT NOW(),
        UNIQUE(customer_id)
      )
    `);
    console.log('✅ customer_documents table created');

    // Verify
    const cols = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'customer_documents'
      ORDER BY ordinal_position
    `);
    console.log('\n=== customer_documents columns ===');
    console.table(cols.rows);

    const custCols = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'customers' AND column_name = 'kyc_verified'
    `);
    console.log('kyc_verified in customers:', custCols.rows.length > 0 ? '✅' : '❌');

    console.log('\n✅ KYC migration complete');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
