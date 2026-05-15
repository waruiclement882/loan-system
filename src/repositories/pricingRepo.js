const pool = require("../db/pool");

async function getPricing(loan_amount, term_weeks) {
  const query = `
    SELECT loan_amount, term_weeks, interest_amount, total_amount
    FROM loan_pricing_rules
    WHERE loan_amount = $1 AND term_weeks = $2
    LIMIT 1
  `;

  const result = await pool.query(query, [loan_amount, term_weeks]);
  return result.rows[0];
}

module.exports = {
  getPricing,
};