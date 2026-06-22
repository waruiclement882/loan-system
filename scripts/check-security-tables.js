require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function check() {
  console.log('\n=== USERS TABLE COLUMNS ===');
  const users = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position");
  console.table(users.rows);

  console.log('\n=== AUDIT_LOGS TABLE COLUMNS ===');
  const audit = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'audit_logs' ORDER BY ordinal_position");
  console.table(audit.rows);

  await pool.end();
}

check().catch(e => { console.error(e.message); pool.end(); });
