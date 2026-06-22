require('dotenv').config();
const pool = require('./src/db/pool');

async function run() {
  // ── 1. Add the 4 new products ────────────────────────────────────────────
  const newProducts = [
    { amount: 12000, term: 6, interest: 2750, total: 16500 },  // was missing, fee=950
    { amount: 13000, term: 6, interest: 2979, total: 17874 },  // fee=950
    { amount: 14000, term: 6, interest: 3208, total: 19284 },  // fee=950
    { amount: 15000, term: 6, interest: 3437, total: 20622 },  // fee=950 (replaces old 15000/6)
  ];

  for (const p of newProducts) {
    // Delete if exists to avoid duplicates
    await pool.query(
      'DELETE FROM loan_pricing_rules WHERE loan_amount = $1 AND term_weeks = $2',
      [p.amount, p.term]
    );
    await pool.query(
      'INSERT INTO loan_pricing_rules (loan_amount, term_weeks, interest_amount, total_amount, processing_fee) VALUES ($1, $2, $3, $4, $5)',
      [p.amount, p.term, p.interest, p.total, 950]
    );
    console.log(`✅ Added: KSh ${p.amount.toLocaleString()} / ${p.term} weeks → total KSh ${p.total.toLocaleString()}`);
  }

  // ── 2. Show final schedule ───────────────────────────────────────────────
  const rules = await pool.query(
    'SELECT loan_amount, term_weeks, interest_amount, total_amount, processing_fee FROM loan_pricing_rules ORDER BY loan_amount, term_weeks'
  );
  console.log('\n📊 Final loan products:');
  console.table(rules.rows);

  process.exit(0);
}

run().catch(err => { console.error('❌', err.message); process.exit(1); });
