require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS location_accuracy NUMERIC(8,2)`);
    await client.query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMP`);
    await client.query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS location_updated_by VARCHAR(100)`);
    console.log('✅ GPS columns added to customers');

    const cols = await client.query(`
      SELECT column_name, data_type FROM information_schema.columns
      WHERE table_name = 'customers'
      AND column_name IN ('latitude','longitude','location_accuracy','location_updated_at','location_updated_by')
      ORDER BY column_name
    `);
    console.table(cols.rows);
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
