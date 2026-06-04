const paymentService = require('../services/paymentService');
const pool = require('../db/pool');
const scheduleService = require('../services/scheduleService');

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

  async getIncome(req, res) {
    try {
      const result = await pool.query(`
        SELECT ci.*, l.customer_id, c.name as customer_name, u.name as recorded_by_name
        FROM company_income ci
        LEFT JOIN loans l ON ci.loan_id = l.id
        LEFT JOIN customers c ON l.customer_id = c.id
        LEFT JOIN users u ON ci.recorded_by = u.id
        ORDER BY ci.created_at DESC
      `);
      const total = result.rows.reduce((s, r) => s + parseFloat(r.amount || 0), 0);
      res.json({ income: result.rows, total });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async matchTransaction(req, res) {
    const client = await pool.connect();
    try {
      const { transaction_id, loan_id, type } = req.body;
      const recorded_by = req.user?.id || req.user?.user_id;

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
        // Mark fee as paid on loan
        await client.query(
          `UPDATE loans SET processing_fee_paid = TRUE, processing_fee_transaction = $1 WHERE id = $2`,
          [tx.transaction_reference, loan_id]
        );
        // Record as company income
        await client.query(
          `INSERT INTO company_income (loan_id, amount, type, transaction_code, recorded_by, notes)
           VALUES ($1, $2, 'processing_fee', $3, $4, 'Processing fee via KCB Paybill')`,
          [loan_id, tx.amount, tx.transaction_reference, recorded_by]
        );
      } else {
        const currentBalance = parseFloat(loan.balance) || 0;
        const newBalance = Math.max(0, currentBalance - parseFloat(tx.amount));
        const newStatus = newBalance === 0 ? 'paid' : 'active';
        await client.query(
          'UPDATE loans SET balance = $1, status = $2 WHERE id = $3',
          [newBalance, newStatus, loan_id]
        );
        await scheduleService.applyPaymentToSchedule(loan_id, parseFloat(tx.amount));
      }

      await client.query(
        `INSERT INTO payments (loan_id, amount, transaction_code, source, kcb_transaction_id, phone_number, payment_date)
         VALUES ($1, $2, $3, 'kcb_paybill', $4, $5, NOW())`,
        [loan_id, tx.amount, tx.transaction_reference, tx.transaction_reference, tx.customer_phone]
      );

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

  async manualPayment(req, res) {
    const client = await pool.connect();
    try {
      const { loan_id, amount, source, transaction_code, notes, type } = req.body;
      const recorded_by = req.user?.id || req.user?.user_id;

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
        return res.status(400).json({ error: `Loan is ${loan.status} — cannot record payment` });
      }

      const txCode = transaction_code || `MANUAL-${Date.now()}`;

      if (type === 'processing_fee' || (loan.status === 'approved' && !loan.processing_fee_paid)) {
        // Processing fee — record as company income
        await client.query(
          `UPDATE loans SET processing_fee_paid = TRUE, processing_fee_transaction = $1 WHERE id = $2`,
          [txCode, loan_id]
        );
        await client.query(
          `INSERT INTO company_income (loan_id, amount, type, transaction_code, recorded_by, notes)
           VALUES ($1, $2, 'processing_fee', $3, $4, $5)`,
          [loan_id, amount, txCode, recorded_by, notes || 'Manual processing fee']
        );
      } else {
        // Regular repayment
        const currentBalance = parseFloat(loan.balance) || 0;
        const newBalance = Math.max(0, currentBalance - parseFloat(amount));
        const newStatus = newBalance === 0 ? 'paid' : 'active';
        await client.query(
          'UPDATE loans SET balance = $1, status = $2 WHERE id = $3',
          [newBalance, newStatus, loan_id]
        );
        await scheduleService.applyPaymentToSchedule(loan_id, parseFloat(amount));
      }

      // Record payment
      await client.query(
        `INSERT INTO payments (loan_id, amount, transaction_code, source, payment_date)
         VALUES ($1, $2, $3, $4, NOW())`,
        [loan_id, amount, txCode, source || 'cash']
      );

      // Audit log
      await pool.query(
        'INSERT INTO audit_logs (user_id, user_name, action, entity, entity_id, details) VALUES ($1,$2,$3,$4,$5,$6)',
        [recorded_by, 'Cashier', 'RECORD_PAYMENT', 'payments', loan_id,
         `Payment of KSh ${amount} for loan #${loan_id} via ${source}`]
      );

      await client.query('COMMIT');

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
      } catch {}

      res.json({ message: 'Payment recorded successfully' });
    } catch (error) {
      await client.query('ROLLBACK');
      res.status(500).json({ error: error.message });
    } finally {
      client.release();
    }
  }
}

module.exports = new PaymentController();