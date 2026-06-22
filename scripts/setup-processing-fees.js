require('dotenv').config();
const pool = require('./src/db/pool');
const fs = require('fs');

async function run() {
  console.log('🔧 Setting up processing fees and loan products...\n');

  // ── 1. Add processing_fee column to loan_pricing_rules ──────────────────
  await pool.query(`
    ALTER TABLE loan_pricing_rules 
    ADD COLUMN IF NOT EXISTS processing_fee numeric DEFAULT 0
  `);
  console.log('✅ processing_fee column added to loan_pricing_rules');

  // ── 2. Add processing_fee & processing_fee_paid to loans ────────────────
  await pool.query(`ALTER TABLE loans ADD COLUMN IF NOT EXISTS processing_fee numeric DEFAULT 0`);
  await pool.query(`ALTER TABLE loans ADD COLUMN IF NOT EXISTS processing_fee_paid boolean DEFAULT false`);
  await pool.query(`ALTER TABLE loans ADD COLUMN IF NOT EXISTS processing_fee_paid_at timestamp`);
  await pool.query(`ALTER TABLE loans ADD COLUMN IF NOT EXISTS processing_fee_transaction text`);
  console.log('✅ processing_fee columns added to loans');

  // ── 3. Clear and re-seed pricing rules with processing fees ─────────────
  await pool.query(`DELETE FROM loan_pricing_rules`);

  // Processing fee: <10000 = 700, =10000 = 800, >10000 = 950
  const getProcessingFee = (amount) => {
    if (amount < 10000) return 700;
    if (amount === 10000) return 800;
    return 950;
  };

  const products = [
    // amount, term_weeks, interest_amount
    { amount: 4000,  term: 4,  interest: 1200  },
    { amount: 4000,  term: 6,  interest: 2108  },
    { amount: 5000,  term: 4,  interest: 1500  },
    { amount: 5000,  term: 6,  interest: 2650  },
    { amount: 6000,  term: 4,  interest: 1800  },
    { amount: 6000,  term: 6,  interest: 1500  },
    { amount: 7000,  term: 4,  interest: 2100  },
    { amount: 7000,  term: 6,  interest: 3020  },
    { amount: 8000,  term: 4,  interest: 2400  },
    { amount: 8000,  term: 6,  interest: 3010  },
    { amount: 9000,  term: 4,  interest: 2700  },
    { amount: 9000,  term: 6,  interest: 2000  },
    { amount: 10000, term: 4,  interest: 2000  },
    { amount: 10000, term: 6,  interest: 2167  },
    { amount: 10000, term: 8,  interest: 3000  },
    { amount: 15000, term: 6,  interest: 3750  },
    { amount: 15000, term: 8,  interest: 4500  },
    { amount: 15000, term: 12, interest: 6000  },
    { amount: 20000, term: 8,  interest: 5000  },
    { amount: 20000, term: 12, interest: 7000  },
    { amount: 25000, term: 8,  interest: 6250  },
    { amount: 25000, term: 12, interest: 8750  },
    { amount: 30000, term: 12, interest: 9000  },
    { amount: 30000, term: 16, interest: 12000 },
    { amount: 50000, term: 12, interest: 12500 },
    { amount: 50000, term: 16, interest: 15000 },
  ];

  for (const p of products) {
    const processingFee = getProcessingFee(p.amount);
    const total = p.amount + p.interest;
    await pool.query(`
      INSERT INTO loan_pricing_rules (loan_amount, term_weeks, interest_amount, total_amount, processing_fee)
      VALUES ($1, $2, $3, $4, $5)
    `, [p.amount, p.term, p.interest, total, processingFee]);
  }
  console.log(`✅ ${products.length} loan products seeded`);

  // ── 4. Show updated rules ────────────────────────────────────────────────
  const rules = await pool.query(`
    SELECT loan_amount, term_weeks, interest_amount, total_amount, processing_fee 
    FROM loan_pricing_rules ORDER BY loan_amount, term_weeks
  `);
  console.log('\n📊 Updated loan products:');
  console.table(rules.rows);

  // ── 5. Update pricingController to use correct table name ───────────────
  const pricingController = `const pool = require('../db/connection');

const getPricingRules = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM loan_pricing_rules ORDER BY loan_amount, term_weeks'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getPricingRules };
`;
  fs.writeFileSync('src/controllers/pricingController.js', pricingController);
  console.log('\n✅ pricingController.js updated to use loan_pricing_rules');

  // ── 6. Update disburseLoan to check processing fee ───────────────────────
  const loanRepo = fs.readFileSync('src/repositories/loanRepository.js', 'utf8');
  
  const disburseCheck = `
const disburse = async (id, disbursed_by) => {
  // Check processing fee paid before disbursing
  const loanCheck = await pool.query('SELECT * FROM loans WHERE id = $1', [id]);
  if (loanCheck.rows.length === 0) return null;
  const loan = loanCheck.rows[0];
  
  if (!loan.processing_fee_paid) {
    throw new Error('Processing fee must be paid before disbursement');
  }
  if (loan.status !== 'approved') return null;

  const result = await pool.query(
    \`UPDATE loans SET status = 'active', disbursed_at = NOW(), disbursed_by = $1, balance = amount WHERE id = $2 RETURNING *\`,
    [disbursed_by, id]
  );
  return result.rows[0];
};
`;

  if (!loanRepo.includes('processing_fee_paid')) {
    // Write updated repo note — full update handled separately
    console.log('\n📌 Note: Update loanRepository.js disburse() to check processing_fee_paid');
    console.log('   (see next step)');
  }

  console.log('\n🎉 Done! Processing fees:');
  console.log('   Loans < KSh 10,000  → KSh 700');
  console.log('   Loan = KSh 10,000   → KSh 800');
  console.log('   Loans > KSh 10,000  → KSh 950');
  console.log('\n📌 Next: Update loanRepository + loans page to show processing fee');

  process.exit(0);
}

run().catch(err => { console.error('❌', err.message); process.exit(1); });
