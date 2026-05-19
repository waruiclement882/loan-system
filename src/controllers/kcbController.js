const pool = require('../db/connection');

const handlePayment = async (req, res) => {
  try {
    const {
      transactionReference,    // KCB transaction ID e.g "FT00026252"
      requestId,               // Unique request ID
      channelCode,             // Channel code
      timestamp,               // Transaction timestamp
      transactionAmount,       // Amount paid e.g "100.00"
      currency,                // Currency e.g "KES"
      customerReference,       // Account number entered by customer (loan ID)
      customerName,            // Customer name
      customerMobileNumber,    // Customer phone number
      narration,               // Payment narration
      creditAccountIdentifier, // Your account identifier
      organizationShortCode,   // Your paybill number
    } = req.body;

    console.log('KCB IPN Payment received:', req.body);

    // Respond to KCB immediately as required
    res.json({
      transactionID: transactionReference,
      statusCode: "0",
      statusMessage: "Notification received"
    });

    if (!transactionReference || !transactionAmount || !customerReference) {
      console.error('Missing required fields:', req.body);
      return;
    }

    // Find loan by customerReference (customer enters loan ID as account number)
    const loanResult = await pool.query(
      'SELECT * FROM loans WHERE id = $1',
      [customerReference]
    );

    if (loanResult.rows.length === 0) {
      console.error('Loan not found for reference:', customerReference);
      return;
    }

    const loan = loanResult.rows[0];
    const amount = parseFloat(transactionAmount);
    const currentBalance = parseFloat(loan.balance) || parseFloat(loan.total_amount) || 0;
    const newBalance = Math.max(0, currentBalance - amount);
    const newStatus = newBalance === 0 ? 'paid' : 'active';

    // Check for duplicate transaction
    const duplicate = await pool.query(
      'SELECT id FROM payments WHERE kcb_transaction_id = $1',
      [transactionReference]
    );

    if (duplicate.rows.length > 0) {
      console.log('Duplicate transaction ignored:', transactionReference);
      return;
    }

    // Record the payment
    await pool.query(
      `INSERT INTO payments 
        (loan_id, amount, transaction_code, source, kcb_transaction_id, phone_number, account_number, payment_date)
       VALUES ($1, $2, $3, 'kcb_paybill', $4, $5, $6, NOW())`,
      [loan.id, amount, transactionReference, transactionReference, customerMobileNumber, customerReference]
    );

    // Update loan balance and status
    await pool.query(
      'UPDATE loans SET balance = $1, status = $2 WHERE id = $3',
      [newBalance, newStatus, loan.id]
    );

    console.log(`Loan ${loan.id} - Payment KSh ${amount} received. New balance: KSh ${newBalance} Status: ${newStatus}`);

  } catch (error) {
    console.error('KCB IPN error:', error.message);
    // Still respond to KCB even on error
    if (!res.headersSent) {
      res.json({
        transactionID: req.body.transactionReference || 'ERROR',
        statusCode: "1",
        statusMessage: "Processing failed"
      });
    }
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