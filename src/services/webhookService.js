const pool = require('../db/connection');
const { getProvider } = require('./providers/providerFactory');

const logWebhook = async ({ provider, endpoint, method, headers, body, signatureValid, responseCode, responseBody, processingTimeMs, ipAddress }) => {
  try {
    await pool.query(
      `INSERT INTO webhook_logs (provider, endpoint, method, headers, body, signature_valid, response_code, response_body, processing_time_ms, ip_address)
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

const processKcbWebhook = async ({ headers, body, ip }) => {
  const startTime = Date.now();
  const provider = getProvider('kcb');
  const signature = headers['signature'] || headers['Signature'];
  const signatureResult = provider.validateWebhookSignature(signature, body);
  const normalized = provider.normalizePayload(body);

  if (!normalized.transactionReference || !normalized.amount) {
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

  // Just record the transaction — cashier will match manually
  const bankTransactionId = await recordTransaction(normalized, 'received');

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

  return { statusCode: 200, response: responseBody };
};

module.exports = { processKcbWebhook, logWebhook };