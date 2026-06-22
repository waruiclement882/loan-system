require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

pool.query("UPDATE payments SET source = 'kcb_paybill' WHERE source != 'kcb_paybill'")
  .then(r => {
    console.log(`✅ Updated ${r.rowCount} payments to kcb_paybill`);
    return pool.query("SELECT source, COUNT(*) as count FROM payments GROUP BY source");
  })
  .then(r => { console.table(r.rows); pool.end(); })
  .catch(e => { console.error(e.message); pool.end(); });
