require('dotenv').config();
const pool = require('./src/db/pool');

async function run() {
  await pool.query('DELETE FROM loan_pricing_rules');
  console.log('🗑️  Cleared all pricing rules');

  const products = [
    // Original 8
    { amount: 4000,  term: 6, interest: 2108, total: 6108  },
    { amount: 5000,  term: 6, interest: 2650, total: 7650  },
    { amount: 6000,  term: 6, interest: 1500, total: 7500  },
    { amount: 7000,  term: 6, interest: 3020, total: 10020 },
    { amount: 8000,  term: 6, interest: 3010, total: 11010 },
    { amount: 9000,  term: 6, interest: 2000, total: 11000 },
    { amount: 10000, term: 4, interest: 2000, total: 12000 },
    { amount: 10000, term: 6, interest: 2167, total: 12167 },
    // 4 new ones you specified
    { amount: 12000, term: 6, interest: 2750, total: 16500 },
    { amount: 13000, term: 6, interest: 2979, total: 17874 },
    { amount: 14000, term: 6, interest: 3208, total: 19284 },
    { amount: 15000, term: 6, interest: 3437, total: 20622 },
  ];

  const getProcessingFee = (amount) => {
    if (amount < 10000) return 700;
    if (amount === 10000) return 800;
    return 950;
  };

  for (const p of products) {
    await pool.query(
      'INSERT INTO loan_pricing_rules (loan_amount, term_weeks, interest_amount, total_amount, processing_fee) VALUES ($1, $2, $3, $4, $5)',
      [p.amount, p.term, p.interest, p.total, getProcessingFee(p.amount)]
    );
  }

  const rules = await pool.query(
    'SELECT loan_amount, term_weeks, interest_amount, total_amount, processing_fee FROM loan_pricing_rules ORDER BY loan_amount, term_weeks'
  );
  console.log('\n📊 Final loan products:');
  console.table(rules.rows);
  console.log(`\n✅ ${rules.rows.length} products total`);

  process.exit(0);
}

run().catch(err => { console.error('❌', err.message); process.exit(1); });
