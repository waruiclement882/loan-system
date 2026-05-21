require('dotenv').config();
const pool = require('./src/db/pool');

async function run() {
  const r = await pool.query(
    'UPDATE loan_pricing_rules SET total_amount = $1 WHERE loan_amount = $2 AND term_weeks = $3 RETURNING *',
    [13002, 10000, 6]
  );
  console.log('✅ Updated:', r.rows[0]);

  const rules = await pool.query(
    'SELECT loan_amount, term_weeks, interest_amount, total_amount, processing_fee FROM loan_pricing_rules ORDER BY loan_amount, term_weeks'
  );
  console.log('\n📊 Final loan products:');
  console.table(rules.rows);
  process.exit(0);
}

run().catch(err => { console.error('❌', err.message); process.exit(1); });
