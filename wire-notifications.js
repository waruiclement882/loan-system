const fs = require('fs');

fs.writeFileSync('src/controllers/loanController.js', `const loanService = require('../services/loanService');
const emailService = require('../services/emailService');
const smsService = require('../services/smsService');
const pool = require('../db/connection');

const getCustomer = async (customerId) => {
  const r = await pool.query('SELECT * FROM customers WHERE id = $1', [customerId]);
  return r.rows[0];
};

const getAllLoans = async (req, res) => {
  try {
    const { status } = req.query;
    const loans = await loanService.getAllLoans(status);
    res.json(loans);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getLoanById = async (req, res) => {
  try {
    const loan = await loanService.getLoanById(req.params.id);
    if (!loan) return res.status(404).json({ error: 'Loan not found' });
    res.json(loan);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createLoan = async (req, res) => {
  try {
    const loan = await loanService.createLoan({ ...req.body, created_by: req.user?.user_id || req.user?.id });
    res.status(201).json(loan);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const approveLoan = async (req, res) => {
  try {
    const loan = await loanService.approveLoan(req.params.id, req.user?.user_id || req.user?.id);
    if (!loan) return res.status(404).json({ error: 'Loan not found or not pending' });

    // Send notifications async — don't block response
    const customer = await getCustomer(loan.customer_id);
    if (customer) {
      emailService.sendLoanApprovedEmail(customer, loan).catch(e => console.error('[Notify] Email error:', e.message));
      smsService.sendLoanApprovedSms(customer.phone, loan.id, loan.amount).catch(e => console.error('[Notify] SMS error:', e.message));
    }

    res.json(loan);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const rejectLoan = async (req, res) => {
  try {
    const { reason } = req.body;
    const loan = await loanService.rejectLoan(req.params.id, req.user?.user_id || req.user?.id, reason);
    if (!loan) return res.status(404).json({ error: 'Loan not found or not pending' });

    const customer = await getCustomer(loan.customer_id);
    if (customer) {
      emailService.sendLoanRejectedEmail(customer, loan).catch(e => console.error('[Notify] Email error:', e.message));
      smsService.sendLoanRejectedSms(customer.phone, loan.id).catch(e => console.error('[Notify] SMS error:', e.message));
    }

    res.json(loan);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const disburseLoan = async (req, res) => {
  try {
    const loan = await loanService.disburseLoan(req.params.id, req.user?.user_id || req.user?.id);
    if (!loan) return res.status(404).json({ error: 'Loan not found or not approved' });

    const customer = await getCustomer(loan.customer_id);
    if (customer) {
      emailService.sendLoanDisbursedEmail(customer, loan).catch(e => console.error('[Notify] Email error:', e.message));
      smsService.sendLoanDisbursedSms(customer.phone, loan.id, loan.amount, process.env.KCB_PAYBILL).catch(e => console.error('[Notify] SMS error:', e.message));
    }

    res.json(loan);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const updateLoanStatus = async (req, res) => {
  try {
    const loan = await loanService.updateLoanStatus(req.params.id, req.body.status);
    if (!loan) return res.status(404).json({ error: 'Loan not found' });
    res.json(loan);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const deleteLoan = async (req, res) => {
  try {
    res.json({ message: 'Loan deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getAllLoans, getLoanById, createLoan, approveLoan, rejectLoan, disburseLoan, updateLoanStatus, deleteLoan };
`);

// Update webhook service to send payment notifications
const webhookService = fs.readFileSync('src/services/webhookService.js', 'utf8');
if (!webhookService.includes('emailService')) {
  const updated = webhookService.replace(
    "const pool = require('../db/connection');",
    `const pool = require('../db/connection');
const emailService = require('./emailService');
const smsService = require('./smsService');`
  ).replace(
    "console.log(`[WebhookService] Loan ${loan.id} - KSh ${normalized.amount} received. Balance: KSh ${newBalance}. Status: ${newStatus}`);",
    `console.log(\`[WebhookService] Loan \${loan.id} - KSh \${normalized.amount} received. Balance: KSh \${newBalance}. Status: \${newStatus}\`);

    // Send payment notifications async
    const customerResult = await pool.query('SELECT * FROM customers WHERE id = $1', [loan.customer_id]);
    const customer = customerResult.rows[0];
    const paymentRecord = { amount: normalized.amount, transaction_code: normalized.transactionReference, kcb_transaction_id: normalized.transactionReference };
    const updatedLoan = { ...loan, balance: newBalance };
    if (customer) {
      emailService.sendPaymentReceivedEmail(customer, paymentRecord, updatedLoan).catch(e => console.error('[Notify] Email error:', e.message));
      smsService.sendPaymentReceivedSms(customer.phone, normalized.amount, loan.id, newBalance).catch(e => console.error('[Notify] SMS error:', e.message));
    }`
  );
  fs.writeFileSync('src/services/webhookService.js', updated, 'utf8');
  console.log('Webhook service updated with notifications!');
} else {
  console.log('Webhook service already has notifications!');
}

console.log('Loan controller updated with notifications!');
