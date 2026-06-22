require('dotenv').config();
const pool = require('./src/db/pool');

async function run() {
  // Check columns
  const cols = await pool.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'loan_pricing_rules' 
    ORDER BY ordinal_position
  `);
  console.log('📋 loan_pricing_rules columns:');
  console.table(cols.rows);

  // Check data
  const data = await pool.query(`SELECT * FROM loan_pricing_rules ORDER BY loan_amount, term_weeks`);
  console.log('\n📊 Current pricing rules:');
  console.table(data.rows);

  // Check loans table columns
  const loanCols = await pool.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'loans' 
    ORDER BY ordinal_position
  `);
  console.log('\n📋 loans table columns:');
  console.table(loanCols.rows);

  process.exit(0);
}

run().catch(err => { console.error(err.message); process.exit(1); });
