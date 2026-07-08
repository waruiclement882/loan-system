const paymentService = require('../services/paymentService');
const pool = require('../db/pool');
const scheduleService = require('../services/scheduleService');
const loanRepository = require('../repositories/loanRepository');
const suspenseService = require('../services/suspenseService');

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
        SELECT
          ci.id, ci.loan_id, ci.amount, ci.type,
          ci.transaction_code, ci.notes, ci.created_at,
          c.name AS customer_name,
          u.name AS recorded_by_name
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
        await client.query(
          `UPDATE loans SET processing_fee_paid = TRUE, processing_fee_transaction = $1 WHERE id = $2`,
          [tx.transaction_reference, loan_id]
        );
        await client.query(
          `INSERT INTO company_income (loan_id, amount, type, transaction_code, recorded_by, notes)
           VALUES ($1, $2, 'processing_fee', $3, $4, 'Processing fee via KCB Paybill')`,
          [loan_id, tx.amount, tx.transaction_reference, recorded_by]
        );

        // Insert payment record for processing fee
        await client.query(
          `INSERT INTO payments (loan_id, amount, transaction_code, source, kcb_transaction_id, phone_number, payment_date)
           VALUES ($1, $2, $3, 'kcb_paybill', $4, $5, NOW())`,
          [loan_id, tx.amount, tx.transaction_reference, tx.transaction_reference, tx.customer_phone]
        );
      } else {
        // Regular repayment
        const currentBalance = parseFloat(loan.balance) || 0;
        const paymentAmount = parseFloat(tx.amount);

        // Insert payment record first so we have an ID
        const payRes = await client.query(
          `INSERT INTO payments (loan_id, amount, transaction_code, source, kcb_transaction_id, phone_number, payment_date)
           VALUES ($1, $2, $3, 'kcb_paybill', $4, $5, NOW()) RETURNING id`,
          [loan_id, tx.amount, tx.transaction_reference, tx.transaction_reference, tx.customer_phone]
        );

        if (paymentAmount > currentBalance) {
          // Overpayment — flag it for admin review
          await suspenseService.flagOverpaymentIfAny(client, {
            loan_id,
            customer_id: loan.customer_id,
            payment_id: payRes.rows[0].id,
            payment_amount: paymentAmount,
            loan_balance_before: currentBalance
          });
          await client.query('UPDATE loans SET balance = 0 WHERE id = $1', [loan_id]);
          await scheduleService.applyPaymentToSchedule(loan_id, currentBalance);
          console.log(`[Overpayment] Flagged KSh ${paymentAmount - currentBalance} excess on loan #${loan_id}`);
        } else {
          const newBalance = Math.max(0, currentBalance - paymentAmount);
          await client.query('UPDATE loans SET balance = $1 WHERE id = $2', [newBalance, loan_id]);
          await scheduleService.applyPaymentToSchedule(loan_id, paymentAmount);
        }
      }

      await client.query(
        `UPDATE bank_transactions SET status = 'processed', loan_id = $1, processed_at = NOW() WHERE id = $2`,
        [loan_id, transaction_id]
      );

      await client.query(
        'INSERT INTO audit_logs (user_id, user_name, action, entity, entity_id, details) VALUES ($1,$2,$3,$4,$5,$6)',
        [
          recorded_by, 'Cashier', 'MATCH_TRANSACTION', 'payments', loan_id,
          JSON.stringify({
            message: `Matched transaction ${tx.transaction_reference} of KSh ${tx.amount} to loan #${loan_id}`,
            amount: tx.amount,
            transaction_reference: tx.transaction_reference
          })
        ]
      );

      await client.query('COMMIT');

      // Check if loan is now fully paid
      const updatedLoan = await pool.query('SELECT balance FROM loans WHERE id = $1', [loan_id]);
      if (parseFloat(updatedLoan.rows[0]?.balance) === 0) {
        await loanRepository.closeLoan(loan_id);
        console.log(`[Closure] Loan #${loan_id} auto-closed after KCB match`);
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
        await client.query(
          `UPDATE loans SET processing_fee_paid = TRUE, processing_fee_transaction = $1 WHERE id = $2`,
          [txCode, loan_id]
        );
        await client.query(
          `INSERT INTO company_income (loan_id, amount, type, transaction_code, recorded_by, notes)
           VALUES ($1, $2, 'processing_fee', $3, $4, $5)`,
          [loan_id, amount, txCode, recorded_by, notes || 'Manual processing fee']
        );
        // Processing fee goes to company_income ONLY — no payment record
      } else {
        // Regular repayment
        const currentBalance = parseFloat(loan.balance) || 0;
        const paymentAmount = parseFloat(amount);

        // Insert payment record first so we have an ID
        const payRes = await client.query(
          `INSERT INTO payments (loan_id, amount, transaction_code, source, notes, payment_date)
           VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id`,
          [loan_id, amount, txCode, source || 'cash', notes || null]
        );

        if (paymentAmount > currentBalance) {
          // Overpayment — flag for admin review
          await suspenseService.flagOverpaymentIfAny(client, {
            loan_id,
            customer_id: loan.customer_id,
            payment_id: payRes.rows[0].id,
            payment_amount: paymentAmount,
            loan_balance_before: currentBalance
          });
          await client.query('UPDATE loans SET balance = 0 WHERE id = $1', [loan_id]);
          await scheduleService.applyPaymentToSchedule(loan_id, currentBalance);
          console.log(`[Overpayment] Flagged KSh ${paymentAmount - currentBalance} excess on loan #${loan_id}`);
        } else {
          const newBalance = Math.max(0, currentBalance - paymentAmount);
          await client.query('UPDATE loans SET balance = $1 WHERE id = $2', [newBalance, loan_id]);
          await scheduleService.applyPaymentToSchedule(loan_id, paymentAmount);
        }
      }

      // Audit log
      await pool.query(
        'INSERT INTO audit_logs (user_id, user_name, action, entity, entity_id, details) VALUES ($1,$2,$3,$4,$5,$6)',
        [
          recorded_by, 'Cashier', 'RECORD_PAYMENT', 'payments', loan_id,
          JSON.stringify({
            message: `Payment of KSh ${amount} for loan #${loan_id} via ${source}`,
            amount, source, transaction_code: txCode, notes: notes || null
          })
        ]
      );

      await client.query('COMMIT');

      // Check if loan is now fully paid
      const updatedLoan = await pool.query('SELECT balance FROM loans WHERE id = $1', [loan_id]);
      if (parseFloat(updatedLoan.rows[0]?.balance) === 0) {
        await loanRepository.closeLoan(loan_id);
        console.log(`[Closure] Loan #${loan_id} auto-closed after manual payment`);
      }

      // Send SMS
      try {
        const smsService = require('../services/smsService');
        const customerRes = await pool.query(
          'SELECT customers.phone FROM customers JOIN loans ON loans.customer_id = customers.id WHERE loans.id = $1',
          [loan_id]
        );
        if (customerRes.rows[0]?.phone) {
          const finalLoan = await pool.query('SELECT balance FROM loans WHERE id = $1', [loan_id]);
          smsService.sendPaymentReceivedSms(
            customerRes.rows[0].phone, amount, loan_id,
            finalLoan.rows[0]?.balance || 0
          ).catch(e => console.error('[SMS]', e.message));
        }
      } catch {}

      res.status(201).json({ message: 'Payment recorded successfully', transaction_code: txCode });

    } catch (error) {
      await client.query('ROLLBACK');
      res.status(500).json({ error: error.message });
    } finally {
      client.release();
    }
  }
}

module.exports = new PaymentController();
