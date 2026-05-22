const paymentService = require('../services/paymentService');
const pool = require('../db/pool');

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

  // Get all unmatched KCB transactions
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

  // Cashier matches a transaction to a loan
  async matchTransaction(req, res) {
    const client = await pool.connect();
    try {
      const { transaction_id, loan_id, type } = req.body;
      // type = 'processing_fee' or 'repayment'

      await client.query('BEGIN');

      // Get transaction
      const txResult = await client.query(
        'SELECT * FROM bank_transactions WHERE id = $1 AND status = $2',
        [transaction_id, 'received']
      );
      if (txResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Transaction not found or already matched' });
      }
      const tx = txResult.rows[0];

      // Get loan
      const loanResult = await client.query('SELECT * FROM loans WHERE id = $1', [loan_id]);
      if (loanResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Loan not found' });
      }
      const loan = loanResult.rows[0];

      if (type === 'processing_fee') {
        // Mark processing fee as paid
        await client.query(
          `UPDATE loans SET processing_fee_paid = TRUE, processing_fee_transaction = $1 WHERE id = $2`,
          [tx.transaction_reference, loan_id]
        );
      } else {
        // Repayment — reduce balance
        const currentBalance = parseFloat(loan.balance) || 0;
        const newBalance = Math.max(0, currentBalance - parseFloat(tx.amount));
        const newStatus = newBalance === 0 ? 'paid' : 'active';
        await client.query(
          'UPDATE loans SET balance = $1, status = $2 WHERE id = $3',
          [newBalance, newStatus, loan_id]
        );
      }

      // Record payment
      await client.query(
        `INSERT INTO payments (loan_id, amount, transaction_code, source, kcb_transaction_id, phone_number, payment_date)
         VALUES ($1, $2, $3, 'kcb_paybill', $4, $5, NOW())`,
        [loan_id, tx.amount, tx.transaction_reference, tx.transaction_reference, tx.customer_phone]
      );

      // Mark transaction as processed
      await client.query(
        `UPDATE bank_transactions SET status = 'processed', loan_id = $1, processed_at = NOW() WHERE id = $2`,
        [loan_id, transaction_id]
      );

      await client.query('COMMIT');
      res.json({ message: 'Payment matched successfully' });
    } catch (error) {
      await client.query('ROLLBACK');
      res.status(500).json({ error: error.message });
    } finally {
      client.release();
    }
  }
}

module.exports = new PaymentController();