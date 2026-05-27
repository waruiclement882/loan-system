const fs = require('fs');

// Fix webhook service
let webhook = fs.readFileSync('src/services/webhookService.js', 'utf8');
if (!webhook.includes('loanRepository')) {
  webhook = webhook.replace(
    "const pool = require('../db/connection');",
    `const pool = require('../db/connection');
const loanRepository = require('../repositories/loanRepository');`
  );
}
if (!webhook.includes('applyPaymentToSchedule')) {
  webhook = webhook.replace(
    `console.log(\`[WebhookService] Loan \${loan.id} - KSh \${normalized.amount} received. Balance: KSh \${newBalance}. Status: \${newStatus}\`);`,
    `console.log(\`[WebhookService] Loan \${loan.id} - KSh \${normalized.amount} received. Balance: KSh \${newBalance}. Status: \${newStatus}\`);
    try {
      await loanRepository.applyPaymentToSchedule(loan.id, normalized.amount);
    } catch (e) { console.error('[WebhookService] Schedule update failed:', e.message); }`
  );
}
fs.writeFileSync('src/services/webhookService.js', webhook, 'utf8');
console.log('Webhook service fixed!');

// Fix payment service
let paymentService = fs.readFileSync('src/services/paymentService.js', 'utf8');
console.log('Current paymentService:', paymentService.substring(0, 200));

// Rewrite payment service to update schedule
fs.writeFileSync('src/services/paymentService.js', `const pool = require('../db/connection');
const loanRepository = require('../repositories/loanRepository');

const createPayment = async (data) => {
  const { loan_id, amount, transaction_code, source } = data;

  // Record payment
  const result = await pool.query(
    \`INSERT INTO payments (loan_id, amount, transaction_code, source, payment_date)
     VALUES ($1, $2, $3, $4, NOW()) RETURNING *\`,
    [loan_id, amount, transaction_code, source || 'cash']
  );
  const payment = result.rows[0];

  // Update loan balance
  const loanRes = await pool.query('SELECT * FROM loans WHERE id=$1', [loan_id]);
  if (loanRes.rows[0]) {
    const loan = loanRes.rows[0];
    const currentBalance = parseFloat(loan.balance) || 0;
    const newBalance = Math.max(0, currentBalance - parseFloat(amount));
    const newStatus = newBalance === 0 ? 'paid' : loan.status;

    await pool.query(
      'UPDATE loans SET balance=$1, status=$2 WHERE id=$3',
      [newBalance, newStatus, loan_id]
    );

    // Update repayment schedule
    try {
      await loanRepository.applyPaymentToSchedule(loan_id, parseFloat(amount));
    } catch (e) {
      console.error('[PaymentService] Schedule update failed:', e.message);
    }
  }

  return payment;
};

const getAllPayments = async () => {
  const result = await pool.query(
    \`SELECT payments.*, customers.name as customer_name
     FROM payments
     LEFT JOIN loans ON payments.loan_id = loans.id
     LEFT JOIN customers ON loans.customer_id = customers.id
     ORDER BY payments.payment_date DESC\`
  );
  return result.rows;
};

module.exports = { createPayment, getAllPayments };
`);
console.log('Payment service fixed!');
