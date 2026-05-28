const paymentService = require('../services/paymentService');
const pool = require('../db/connection');
const loanRepository = require('../repositories/loanRepository');

class PaymentController {
  async getAllPayments(req, res) {
    try {
      const payments = await paymentService.getAllPayments();
      res.json(payments);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async createPayment(req, res) {
    try {
      const newPayment = await paymentService.createPayment(req.body);
      res.status(201).json(newPayment);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async getUnmatched(req, res) {
    try {
      const result = await pool.query(`
        SELECT id, transaction_reference, amount, customer_name, customer_phone,
               narration, created_at, status
        FROM bank_transactions
        WHERE status = 'received' AND loan_id IS NULL
        ORDER BY created_at DESC
      `);
      res.json(result.rows);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async matchTransaction(req, res) {
    const client = await pool.connect();
    try {
      const { transaction_id, loan_id, type } = req.body;
      await client.query('BEGIN');

      const txResult = await client.query(
        'SELECT * FROM bank_transactions WHERE id = $1 AND status = $2',
        [transaction_id, 'received']
      );
      if (txResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Transaction not found or already matched' });
      }
      const tx = txResult.rows[0];

      const loanResult = await client.query('SELECT * FROM loans WHERE id = $1', [loan_id]);
      if (loanResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Loan not found' });
      }
      const loan = loanResult.rows[0];

      if (type === 'processing_fee') {
        await client.query(
          'UPDATE loans SET processing_fee_paid = TRUE, processing_fee_transaction = $1 WHERE id = $2',
          [tx.transaction_reference, loan_id]
        );
      } else {
        const currentBalance = parseFloat(loan.balance) || 0;
        const newBalance = Math.max(0, currentBalance - parseFloat(tx.amount));
        const newStatus = newBalance === 0 ? 'paid' : 'active';
        await client.query(
          'UPDATE loans SET balance = $1, status = $2 WHERE id = $3',
          [newBalance, newStatus, loan_id]
        );
      }

      await client.query(
        `INSERT INTO payments (loan_id, amount, transaction_code, source, kcb_transaction_id, phone_number, payment_date)
         VALUES ($1, $2, $3, 'kcb_paybill', $4, $5, NOW())`,
        [loan_id, tx.amount, tx.transaction_reference, tx.transaction_reference, tx.customer_phone]
      );

      await client.query(
        'UPDATE bank_transactions SET status = $1, loan_id = $2, processed_at = NOW() WHERE id = $3',
        ['processed', loan_id, transaction_id]
      );

      await client.query('COMMIT');

      // Update repayment schedule after commit
      if (type !== 'processing_fee') {
        try {
          await applyPaymentToSchedule(loan_id, parseFloat(tx.amount));
        } catch (e) {
          console.error('[Match] Schedule update failed:', e.message);
        }
      }

      res.json({ message: 'Payment matched successfully' });
    } catch (error) {
      await client.query('ROLLBACK');
      res.status(500).json({ error: error.message });
    } finally {
      client.release();
    }
  }

  async manualPayment(req, res) {
    const client = await pool.connect();
    try {
      const { loan_id, amount, source, transaction_code, notes } = req.body;
      if (!loan_id || !amount) {
        return res.status(400).json({ error: 'loan_id and amount are required' });
      }

      await client.query('BEGIN');

      const loanResult = await client.query('SELECT * FROM loans WHERE id = $1', [loan_id]);
      if (loanResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Loan not found' });
      }
      const loan = loanResult.rows[0];

      if (!['active', 'approved'].includes(loan.status)) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Loan is ' + loan.status + ' - cannot record payment' });
      }

      const txCode = transaction_code || ('MANUAL-' + Date.now());
      let isProcessingFee = false;

      if (loan.status === 'approved' && !loan.processing_fee_paid) {
        await client.query(
          'UPDATE loans SET processing_fee_paid = TRUE, processing_fee_transaction = $1 WHERE id = $2',
          [txCode, loan_id]
        );
        isProcessingFee = true;
      } else {
        const currentBalance = parseFloat(loan.balance) || 0;
        const newBalance = Math.max(0, currentBalance - parseFloat(amount));
        const newStatus = newBalance === 0 ? 'paid' : 'active';
        await client.query(
          'UPDATE loans SET balance = $1, status = $2 WHERE id = $3',
          [newBalance, newStatus, loan_id]
        );
      }

      await client.query(
        'INSERT INTO payments (loan_id, amount, transaction_code, source, payment_date) VALUES ($1, $2, $3, $4, NOW())',
        [loan_id, amount, txCode, source || 'cash']
      );

      await client.query('COMMIT');

      // Update repayment schedule after commit
      if (!isProcessingFee) {
        try {
          await applyPaymentToSchedule(loan_id, parseFloat(amount));
        } catch (e) {
          console.error('[Manual] Schedule update failed:', e.message);
        }
      }

      // Send SMS
      try {
        const smsService = require('../services/smsService');
        const customerRes = await pool.query(
          'SELECT customers.phone FROM customers JOIN loans ON loans.customer_id = customers.id WHERE loans.id = $1',
          [loan_id]
        );
        if (customerRes.rows[0]?.phone) {
          const updatedLoan = await pool.query('SELECT balance FROM loans WHERE id = $1', [loan_id]);
          smsService.sendPaymentReceivedSms(
            customerRes.rows[0].phone, amount, loan_id,
            updatedLoan.rows[0]?.balance || 0
          ).catch(e => console.error('[SMS]', e.message));
        }
      } catch (e) {}

      res.json({ message: 'Payment recorded successfully' });
    } catch (error) {
      await client.query('ROLLBACK');
      res.status(500).json({ error: error.message });
    } finally {
      client.release();
    }
  }
}

// Standalone schedule updater using correct column names
const applyPaymentToSchedule = async (loanId, amountPaid) => {
  const installments = await pool.query(
    `SELECT * FROM repayment_schedules WHERE loan_id=$1 AND status != 'paid' ORDER BY installment_no ASC`,
    [loanId]
  );

  let remaining = parseFloat(amountPaid);
  for (const inst of installments.rows) {
    if (remaining <= 0) break;
    const due = parseFloat(inst.amount_due);
    const already = parseFloat(inst.amount_paid || 0);
    const owed = due - already;

    if (remaining >= owed) {
      await pool.query(
        `UPDATE repayment_schedules SET amount_paid=$1, status='paid', paid_at=NOW() WHERE id=$2`,
        [due, inst.id]
      );
      remaining -= owed;
    } else {
      await pool.query(
        `UPDATE repayment_schedules SET amount_paid=$1, status='partial' WHERE id=$2`,
        [already + remaining, inst.id]
      );
      remaining = 0;
    }
  }

  // Mark overdue
  await pool.query(
    `UPDATE repayment_schedules SET status='overdue' WHERE loan_id=$1 AND due_date < NOW() AND status='pending'`,
    [loanId]
  );
};

module.exports = new PaymentController();