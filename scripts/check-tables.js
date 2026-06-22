require('dotenv').config();
const pool = require('./src/db/pool');

async function run() {
  // Check existing tables
  const tables = await pool.query(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name
  `);
  console.log('📋 Existing tables:');
  console.table(tables.rows);
  process.exit(0);
}

run().catch(err => { console.error(err.message); process.exit(1); });
