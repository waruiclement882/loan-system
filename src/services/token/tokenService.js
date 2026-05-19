const axios = require('axios');
const pool = require('../../db/connection');
const { kcbConfig } = require('../../../config/kcb');

const TOKEN_EXPIRY_BUFFER_SECONDS = 60;

const fetchNewToken = async () => {
  try {
    const credentials = Buffer.from(
      `${kcbConfig.consumerKey}:${kcbConfig.consumerSecret}`
    ).toString('base64');

    const response = await axios.post(
      kcbConfig.tokenUrl,
      'grant_type=client_credentials',
      {
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: kcbConfig.timeout,
      }
    );

    const { access_token, expires_in } = response.data;
    if (!access_token) throw new Error('No access_token in KCB response');

    const expiresAt = new Date(Date.now() + expires_in * 1000);

    await pool.query(
      `INSERT INTO token_cache (provider, access_token, expires_at)
       VALUES ('kcb', $1, $2)
       ON CONFLICT (provider)
       DO UPDATE SET access_token = $1, expires_at = $2, created_at = NOW()`,
      [access_token, expiresAt]
    );

    console.log('[TokenService] New KCB token fetched, expires:', expiresAt.toISOString());
    return access_token;
  } catch (err) {
    const message = err.response?.data?.error_description || err.message;
    throw new Error(`[TokenService] Failed to fetch KCB token: ${message}`);
  }
};

const getToken = async () => {
  try {
    const result = await pool.query(
      `SELECT access_token, expires_at FROM token_cache WHERE provider = 'kcb'`
    );

    if (result.rows.length > 0) {
      const { access_token, expires_at } = result.rows[0];
      const bufferTime = new Date(Date.now() + TOKEN_EXPIRY_BUFFER_SECONDS * 1000);
      if (new Date(expires_at) > bufferTime) return access_token;
    }

    return await fetchNewToken();
  } catch (err) {
    throw new Error(`[TokenService] getToken failed: ${err.message}`);
  }
};

module.exports = { getToken };