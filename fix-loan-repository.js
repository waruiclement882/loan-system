const fs = require('fs');
let repo = fs.readFileSync('src/repositories/loanRepository.js', 'utf8');

repo = repo.replace(
  `create = async (loan) => {
  const { customer_id, amount, term_weeks, interest_amount, total_amount, weekly_installment, created_by } = loan;
  const r = await pool.query(
    'INSERT INTO loans (customer_id,amount,term_weeks,interest_amount,total_amount,weekly_installment,balance,status,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
    [customer_id, amount, term_weeks, interest_amount, total_amount, weekly_installment || 0, total_amount, 'pending', created_by || null]
  );`,
  `create = async (loan) => {
  const { customer_id, amount, term_weeks, interest_amount, total_amount, weekly_installment, created_by, branch_id } = loan;
  const r = await pool.query(
    'INSERT INTO loans (customer_id,amount,term_weeks,interest_amount,total_amount,weekly_installment,balance,status,created_by,branch_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *',
    [customer_id, amount, term_weeks, interest_amount, total_amount, weekly_installment || 0, total_amount, 'pending', created_by || null, branch_id || 1]
  );`
);

fs.writeFileSync('src/repositories/loanRepository.js', repo, 'utf8');
console.log('✅ Loan repository fixed with branch_id!');
console.log('Verified:', repo.includes('branch_id || 1'));