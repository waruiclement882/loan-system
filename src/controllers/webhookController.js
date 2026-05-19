const { processKcbWebhook } = require('../services/webhookService');

const handleKcbWebhook = async (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  try {
    const result = await processKcbWebhook({ headers: req.headers, body: req.body, ip });
    return res.status(result.statusCode).json(result.response);
  } catch (err) {
    console.error('[WebhookController] Error:', err.message);
    return res.status(200).json({
      transactionID: req.body?.transactionReference || '',
      statusCode: '1',
      statusMessage: 'Internal processing error',
    });
  }
};

const health = (req, res) => {
  res.json({ status: 'ok', provider: 'kcb', timestamp: new Date().toISOString() });
};

module.exports = { handleKcbWebhook, health };