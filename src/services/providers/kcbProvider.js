const axios = require('axios');
const { kcbConfig } = require('../../../config/kcb');
const { getToken } = require('../token/tokenService');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const makeRequest = async (method, url, data = null, headers = {}, attempt = 1) => {
  try {
    const token = await getToken();
    const response = await axios({
      method, url, data,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...headers,
      },
      timeout: kcbConfig.timeout,
    });
    return response.data;
  } catch (err) {
    const status = err.response?.status;
    if (status === 401) {
      const { pool } = require('../../db/connection');
      await pool.query(`DELETE FROM token_cache WHERE provider = 'kcb'`);
      if (attempt < kcbConfig.retryAttempts) {
        return makeRequest(method, url, data, headers, attempt + 1);
      }
    }
    const isRetryable = !status || status === 429 || status >= 500;
    if (isRetryable && attempt < kcbConfig.retryAttempts) {
      await sleep(kcbConfig.retryDelay * attempt);
      return makeRequest(method, url, data, headers, attempt + 1);
    }
    throw new Error(`[KCBProvider] Request failed: ${err.response?.data?.message || err.message}`);
  }
};

const validateWebhookSignature = (signature, payload) => {
  if (!signature) {
    console.warn('[KCBProvider] No signature header — skipping validation');
    return { valid: true, warning: 'No signature present' };
  }
  return { valid: true, warning: 'Signature validation not yet implemented' };
};

const normalizePayload = (raw) => ({
  transactionReference: raw.transactionReference,
  requestId: raw.requestId,
  channelCode: raw.channelCode,
  timestamp: raw.timestamp,
  amount: parseFloat(raw.transactionAmount || 0),
  currency: raw.currency || 'KES',
  customerReference: raw.customerReference,
  customerName: raw.customerName,
  customerPhone: raw.customerMobileNumber,
  narration: raw.narration,
  organizationShortCode: raw.organizationShortCode,
  raw,
});

module.exports = { makeRequest, validateWebhookSignature, normalizePayload };