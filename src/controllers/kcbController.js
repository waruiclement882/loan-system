const pool = require('../db/connection');

const handlePayment = async (req, res) => {
  try {
    const {
      TransID,        // KCB transaction ID
      TransAmount,    // Amount paid
      BillRefNumber,  // Account number (loan ID entered by customer)
      MSISDN,         // Customer phone number
      TransTime,      // Transaction time
    } = req.body;

    console.log('KCB Payment received:', req.body);

    // Always respond to KCB immediately
    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });

    if (!TransID || !TransAmount || !BillRefNumber) {
      console.error('Missing required fields:', req.body);
      return;
    }

    // Find loan by account number (BillRefNumber = loan ID)
    const loanResult = await pool.query(
      'SELECT * FROM loans WHERE id = $1',
      [BillRefNumber]
    );

    if (loanResult.rows.length === 0) {
      console.error('Loan not found for account:', BillRefNumber);
      return;
    }

    const loan = loanResult.rows[0];
    const amount = parseFloat(TransAmount);
    const currentBalance = parseFloat(loan.balance) || parseFloat(loan.total_amount) || 0;
    const newBalance = Math.max(0, currentBalance - amount);
    const newStatus = newBalance === 0 ? 'paid' : loan.status;

    // Record the payment
    await pool.query(
      `INSERT INTO payments 
        (loan_id, amount, transaction_code, source, kcb_transaction_id, phone_number, account_number, payment_date)
       VALUES ($1, $2, $3, 'kcb_paybill', $4, $5, $6, NOW())`,
      [loan.id, amount, TransID, TransID, MSISDN, BillRefNumber]
    );

    // Update loan balance and status
    await pool.query(
      'UPDATE loans SET balance = $1, status = $2 WHERE id = $3',
      [newBalance, newStatus, loan.id]
    );

    console.log(`Loan ${loan.id} payment of ${amount} processed. New balance: ${newBalance}`);

  } catch (error) {
    console.error('KCB callback error:', error.message);
    res.status(500).json({ ResultCode: 1, ResultDesc: 'Failed' });
  }
};

const getLoanBalance = async (req, res) => {
  try {
    const { loan_id } = req.params;
    const result = await pool.query(
      `SELECT loans.*, customers.name as customer_name 
       FROM loans 
       LEFT JOIN customers ON loans.customer_id = customers.id
       WHERE loans.id = $1`,
      [loan_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    const loan = result.rows[0];
    res.json({
      loan_id: loan.id,
      customer_name: loan.customer_name,
      total_amount: loan.total_amount,
      balance: loan.balance,
      status: loan.status
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { handlePayment, getLoanBalance };