const pool = require('../db/connection');
const { getProvider } = require('./providers/providerFactory');

const logWebhook = async ({ provider, endpoint, method, headers, body, signatureValid, responseCode, responseBody, processingTimeMs, ipAddress }) => {
  try {
    await pool.query(
      `INSERT INTO webhook_logs
        (provider, endpoint, method, headers, body, signature_valid, response_code, response_body, processing_time_ms, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [provider, endpoint, method, JSON.stringify(headers), JSON.stringify(body), signatureValid, responseCode, JSON.stringify(responseBody), processingTimeMs, ipAddress]
    );
  } catch (err) {
    console.error('[WebhookService] Failed to log webhook:', err.message);
  }
};

const isDuplicate = async (transactionReference) => {
  const result = await pool.query(
    `SELECT id, status FROM bank_transactions WHERE transaction_reference = $1`,
    [transactionReference]
  );
  return result.rows.length > 0 ? result.rows[0] : null;
};

const recordTransaction = async (normalized, status = 'received') => {
  const result = await pool.query(
    `INSERT INTO bank_transactions
      (provider, transaction_reference, request_id, amount, currency,
       customer_reference, customer_name, customer_phone, channel_code,
       narration, organization_short_code, raw_payload, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     RETURNING id`,
    [
      'kcb_paybill', normalized.transactionReference, normalized.requestId,
      normalized.amount, normalized.currency, normalized.customerReference,
      normalized.customerName, normalized.customerPhone, normalized.channelCode,
      normalized.narration, normalized.organizationShortCode,
      JSON.stringify(normalized.raw), status,
    ]
  );
  return result.rows[0].id;
};

const reconcileLoan = async (normalized, bankTransactionId) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const loanResult = await client.query(
      `SELECT loans.*, customers.name as customer_name
       FROM loans
       LEFT JOIN customers ON loans.customer_id = customers.id
       WHERE loans.id = $1 FOR UPDATE`,
      [normalized.customerReference]
    );

    if (loanResult.rows.length === 0) {
      await client.query('ROLLBACK');
      await pool.query(
        `UPDATE bank_transactions SET status = 'failed', error_message = $1, processed_at = NOW() WHERE id = $2`,
        [`Loan ID ${normalized.customerReference} not found`, bankTransactionId]
      );
      return { success: false, reason: 'loan_not_found' };
    }

    const loan = loanResult.rows[0];
    const currentBalance = parseFloat(loan.balance) || parseFloat(loan.total_amount) || 0;
    const newBalance = Math.max(0, currentBalance - normalized.amount);
    const newStatus = newBalance === 0 ? 'paid' : 'active';

    await client.query(
      `UPDATE loans SET balance = $1, status = $2 WHERE id = $3`,
      [newBalance, newStatus, loan.id]
    );

    await client.query(
      `INSERT INTO payments
        (loan_id, amount, transaction_code, source, kcb_transaction_id, phone_number, account_number, payment_date)
       VALUES ($1, $2, $3, 'kcb_paybill', $4, $5, $6, NOW())`,
      [loan.id, normalized.amount, normalized.transactionReference, normalized.transactionReference, normalized.customerPhone, normalized.customerReference]
    );

    await client.query(
      `UPDATE bank_transactions SET loan_id = $1, customer_id = $2, status = 'processed', processed_at = NOW() WHERE id = $3`,
      [loan.id, loan.customer_id, bankTransactionId]
    );

    await client.query('COMMIT');
    console.log(`[WebhookService] Loan ${loan.id} - KSh ${normalized.amount} received. Balance: KSh ${newBalance}. Status: ${newStatus}`);
    return { success: true, loanId: loan.id, newBalance, newStatus };
  } catch (err) {
    await client.query('ROLLBACK');
    await pool.query(
      `UPDATE bank_transactions SET status = 'failed', error_message = $1, processed_at = NOW() WHERE id = $2`,
      [err.message, bankTransactionId]
    );
    throw new Error(`[WebhookService] Reconciliation failed: ${err.message}`);
  } finally {
    client.release();
  }
};

const processKcbWebhook = async ({ headers, body, ip }) => {
  const startTime = Date.now();
  const provider = getProvider('kcb');
  const signature = headers['signature'] || headers['Signature'];
  const signatureResult = provider.validateWebhookSignature(signature, body);
  const normalized = provider.normalizePayload(body);

  if (!normalized.transactionReference || !normalized.amount || !normalized.customerReference) {
    return { statusCode: 400, response: { transactionID: '', statusCode: '1', statusMessage: 'Missing required fields' } };
  }

  const existing = await isDuplicate(normalized.transactionReference);
  if (existing) {
    console.warn(`[WebhookService] Duplicate ignored: ${normalized.transactionReference}`);
    return {
      statusCode: 200,
      response: { transactionID: normalized.transactionReference, statusCode: '0', statusMessage: 'Notification received' },
    };
  }

  const bankTransactionId = await recordTransaction(normalized);
  const reconcileResult = await reconcileLoan(normalized, bankTransactionId);

  const responseBody = {
    transactionID: normalized.transactionReference,
    statusCode: '0',
    statusMessage: 'Notification received',
  };

  await logWebhook({
    provider: 'kcb', endpoint: '/webhooks/kcb', method: 'POST',
    headers, body, signatureValid: signatureResult.valid,
    responseCode: 200, responseBody,
    processingTimeMs: Date.now() - startTime, ipAddress: ip,
  });

  return { statusCode: 200, response: responseBody, reconcileResult };
};

module.exports = { processKcbWebhook, logWebhook };