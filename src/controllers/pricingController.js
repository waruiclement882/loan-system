const pool = require('../db/connection');

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
