const pool = require('../db/connection');
const loanRepository = require('../repositories/loanRepository');

const createPayment = async (data) => {
  const { loan_id, amount, transaction_code, source } = data;

  // Record payment
  const result = await pool.query(
    `INSERT INTO payments (loan_id, amount, transaction_code, source, payment_date)
     VALUES ($1, $2, $3, $4, NOW()) RETURNING *`,
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
    `SELECT payments.*, customers.name as customer_name
     FROM payments
     LEFT JOIN loans ON payments.loan_id = loans.id
     LEFT JOIN customers ON loans.customer_id = customers.id
     ORDER BY payments.payment_date DESC`
  );
  return result.rows;
};

module.exports = { createPayment, getAllPayments };
