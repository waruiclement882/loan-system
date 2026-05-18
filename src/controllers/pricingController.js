const pricingService = require("../services/pricingService");
const pool = require("../db/connection");

async function getPricing(req, res) {
  try {
    const { loan_amount, term_weeks } = req.body;
    if (!loan_amount || !term_weeks) {
      return res.status(400).json({ error: "loan_amount and term_weeks are required" });
    }
    const result = await pricingService.fetchPricing(Number(loan_amount), Number(term_weeks));
    if (!result) {
      return res.status(404).json({ error: "Pricing rule not found" });
    }
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
}

async function getAllPricing(req, res) {
  try {
    const result = await pool.query(
      "SELECT * FROM loan_pricing_rules ORDER BY loan_amount, term_weeks"
    );
    return res.json(result.rows);
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
}

module.exports = { getPricing, getAllPricing };