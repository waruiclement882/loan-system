const express = require('express');
const router = express.Router();
const { handleKcbWebhook, health } = require('../controllers/webhookController');

router.get('/kcb/health', health);
router.post('/kcb', handleKcbWebhook);

module.exports = router;