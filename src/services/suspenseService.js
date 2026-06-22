const pool = require('../db/connection');

// Detect overpayment and flag it for admin review instead of silently
// discarding the excess. Called from manualPayment / matchTransaction
// BEFORE the loan balance update, using the balance as it was prior
// to this payment.
const flagOverpaymentIfAny = async (client, { loan_id, customer_id, payment_id, payment_amount, loan_balance_before }) => {
  const excess = parseFloat(payment_amount) - parseFloat(loan_balance_before);
  if (excess <= 0) return null;

  const result = await client.query(
    `INSERT INTO pending_overpayments
       (loan_id, customer_id, payment_id, excess_amount, payment_amount, loan_balance_before)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [loan_id, customer_id, payment_id, excess, payment_amount, loan_balance_before]
  );
  console.log(`[Suspense] Flagged overpayment of KSh ${excess} on loan #${loan_id} for review`);
  return result.rows[0];
};

const getPendingOverpayments = async () => {
  const result = await pool.query(
    `SELECT po.*, c.name AS customer_name, c.phone AS customer_phone
     FROM pending_overpayments po
     JOIN customers c ON po.customer_id = c.id
     WHERE po.status = 'pending'
     ORDER BY po.detected_at DESC`
  );
  return result.rows;
};

// Admin approves a flagged overpayment -> moves the excess into the
// customer's pooled suspense balance and records the audit trail entry.
const approveToSuspense = async (overpaymentId, reviewed_by) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const opRes = await client.query(
      `SELECT * FROM pending_overpayments WHERE id = $1 AND status = 'pending'`,
      [overpaymentId]
    );
    if (opRes.rows.length === 0) {
      await client.query('ROLLBACK');
      throw new Error('Overpayment not found or already reviewed');
    }
    const op = opRes.rows[0];

    await client.query(
      `UPDATE customers SET suspense_balance = suspense_balance + $1 WHERE id = $2`,
      [op.excess_amount, op.customer_id]
    );

    await client.query(
      `INSERT INTO suspense_transactions
         (customer_id, type, amount, source, related_loan_id, related_payment_id, recorded_by, notes)
       VALUES ($1, 'credit', $2, 'overpayment', $3, $4, $5, $6)`,
      [op.customer_id, op.excess_amount, op.loan_id, op.payment_id, reviewed_by,
       `Excess from payment of KSh ${op.payment_amount} on loan #${op.loan_id}`]
    );

    await client.query(
      `UPDATE pending_overpayments SET status = 'approved', reviewed_by = $1, reviewed_at = NOW() WHERE id = $2`,
      [reviewed_by, overpaymentId]
    );

    await client.query('COMMIT');
    return op;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

const getCustomerSuspenseBalances = async () => {
  const result = await pool.query(
    `SELECT id, name, phone, suspense_balance
     FROM customers
     WHERE suspense_balance > 0
     ORDER BY suspense_balance DESC`
  );
  return result.rows;
};

const getSuspenseHistory = async (customerId) => {
  const result = await pool.query(
    `SELECT st.*, u.name AS recorded_by_name
     FROM suspense_transactions st
     LEFT JOIN users u ON st.recorded_by = u.id
     WHERE st.customer_id = $1
     ORDER BY st.created_at DESC`,
    [customerId]
  );
  return result.rows;
};

// Apply suspense funds. use_case: 'processing_fee' | 'installment' | 'refund'
const applySuspense = async ({ customer_id, amount, use_case, loan_id, recorded_by, notes }) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const custRes = await client.query('SELECT suspense_balance FROM customers WHERE id = $1', [customer_id]);
    if (custRes.rows.length === 0) throw new Error('Customer not found');
    const available = parseFloat(custRes.rows[0].suspense_balance);
    const applyAmount = parseFloat(amount);

    if (applyAmount > available) {
      await client.query('ROLLBACK');
      throw new Error(`Requested amount (KSh ${applyAmount}) exceeds available suspense balance (KSh ${available})`);
    }

    await client.query(
      `UPDATE customers SET suspense_balance = suspense_balance - $1 WHERE id = $2`,
      [applyAmount, customer_id]
    );

    await client.query(
      `INSERT INTO suspense_transactions
         (customer_id, type, amount, source, related_loan_id, recorded_by, notes)
       VALUES ($1, 'debit', $2, $3, $4, $5, $6)`,
      [customer_id, applyAmount, use_case, loan_id || null, recorded_by, notes || null]
    );

    if (use_case === 'processing_fee') {
      if (!loan_id) throw new Error('loan_id is required for processing_fee use case');
      await client.query(
        `UPDATE loans SET processing_fee_paid = TRUE, processing_fee_transaction = $1 WHERE id = $2`,
        [`SUSPENSE-${Date.now()}`, loan_id]
      );
      await client.query(
        `INSERT INTO company_income (loan_id, amount, type, transaction_code, recorded_by, notes)
         VALUES ($1, $2, 'processing_fee', $3, $4, $5)`,
        [loan_id, applyAmount, `SUSPENSE-${Date.now()}`, recorded_by, 'Processing fee paid from suspense balance']
      );
    } else if (use_case === 'installment') {
      if (!loan_id) throw new Error('loan_id is required for installment use case');
      const loanRes = await client.query('SELECT balance FROM loans WHERE id = $1', [loan_id]);
      if (loanRes.rows.length === 0) throw new Error('Loan not found');
      const currentBalance = parseFloat(loanRes.rows[0].balance) || 0;
      const newBalance = Math.max(0, currentBalance - applyAmount);
      await client.query('UPDATE loans SET balance = $1 WHERE id = $2', [newBalance, loan_id]);

      const payRes = await client.query(
        `INSERT INTO payments (loan_id, amount, transaction_code, source, notes, payment_date)
         VALUES ($1, $2, $3, 'suspense', $4, NOW()) RETURNING id`,
        [loan_id, applyAmount, `SUSPENSE-${Date.now()}`, notes || 'Applied from suspense balance']
      );

      const loanRepository = require('../repositories/loanRepository');
      await loanRepository.applyPaymentToSchedule(loan_id, applyAmount);

      const updated = await client.query('SELECT balance FROM loans WHERE id = $1', [loan_id]);
      if (parseFloat(updated.rows[0]?.balance) === 0) {
        await loanRepository.closeLoan(loan_id);
      }
    }
    // 'refund' use case: just debits suspense and logs it; the actual cash
    // handoff to the customer happens outside the system.

    await client.query('COMMIT');
    return { customer_id, applied: applyAmount, use_case };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

module.exports = {
  flagOverpaymentIfAny,
  getPendingOverpayments,
  approveToSuspense,
  getCustomerSuspenseBalances,
  getSuspenseHistory,
  applySuspense
};
