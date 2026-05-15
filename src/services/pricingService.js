const pricingRepo = require("../repositories/pricingRepo");

async function fetchPricing(loan_amount, term_weeks) {
  const data = await pricingRepo.getPricing(loan_amount, term_weeks);

  if (!data) {
    return null;
  }

  return data;
}

module.exports = {
  fetchPricing,
};