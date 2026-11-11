const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const pool = require('../db/pool');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');
const { askAssistant, MODEL } = require('../services/aiService');

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 12,
  message: { error: 'Too many questions in a minute. Please wait a moment.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Is the assistant configured?
router.get('/status', verifyToken, requireRole('admin'), (req, res) => {
  res.json({ configured: !!process.env.ANTHROPIC_API_KEY, model: MODEL });
});

// Ask a question
router.post('/chat', verifyToken, requireRole('admin'), chatLimiter, async (req, res) => {
  const { messages } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages is required' });
  }
  const lastUser = [...messages].reverse().find(m => m && m.role === 'user');

  try {
    const result = await askAssistant(messages);
    res.json(result);

    pool.query(
      'INSERT INTO audit_logs (user_id, user_name, action, entity, entity_id, details) VALUES ($1,$2,$3,$4,$5,$6)',
      [
        req.user?.id, req.user?.name || 'Admin', 'AI_QUESTION', 'assistant', null,
        JSON.stringify({
          message: 'Asked the AI assistant',
          question: String(lastUser?.content || '').slice(0, 200),
          lookups: result.toolLog.length,
        }),
      ]
    ).catch(() => {});
  } catch (err) {
    console.error('[AI]', err.message);
    const notConfigured = err.status === 503;
    res.status(notConfigured ? 503 : 500).json({
      error: notConfigured ? err.message : 'Assistant error: ' + String(err.message || 'unknown').slice(0, 300),
    });
  }
});

module.exports = router;
