require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Running location & notes migration...');

    // Add location columns to customers
    await client.query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS location VARCHAR(255)`);
    await client.query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS latitude NUMERIC(10,7)`);
    await client.query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS longitude NUMERIC(10,7)`);
    await client.query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS nearest_landmark VARCHAR(255)`);
    console.log('✅ Location columns added to customers');

    // Customer notes table
    await client.query(`
      CREATE TABLE IF NOT EXISTS customer_notes (
        id           SERIAL PRIMARY KEY,
        customer_id  INTEGER REFERENCES customers(id) ON DELETE CASCADE,
        officer_id   INTEGER REFERENCES users(id),
        officer_name VARCHAR(100),
        category     VARCHAR(20) NOT NULL CHECK (category IN ('call','visit','payment','other')),
        note         TEXT NOT NULL,
        created_at   TIMESTAMP DEFAULT NOW()
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_notes_customer ON customer_notes(customer_id)`);
    console.log('✅ customer_notes table created');

    // Verify
    const cols = await client.query(`
      SELECT column_name, data_type FROM information_schema.columns
      WHERE table_name = 'customers'
      AND column_name IN ('location','latitude','longitude','nearest_landmark')
    `);
    console.log('\n=== NEW CUSTOMER COLUMNS ===');
    console.table(cols.rows);

    const notes = await client.query(`
      SELECT column_name, data_type FROM information_schema.columns
      WHERE table_name = 'customer_notes' ORDER BY ordinal_position
    `);
    console.log('\n=== CUSTOMER_NOTES TABLE ===');
    console.table(notes.rows);

    console.log('\n✅ Migration complete');
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
