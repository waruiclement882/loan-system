const pool = require('../db/connection');

const auditLog = (action, entity) => async (req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = async (data) => {
    // Log after successful response
    if (res.statusCode < 400) {
      try {
        const userId = req.user?.user_id || req.user?.id || null;
        const details = { method: req.method, path: req.path, body: req.body, params: req.params };
        await pool.query(
          'INSERT INTO audit_logs (user_id, action, entity, entity_id, details, ip_address) VALUES ($1,$2,$3,$4,$5,$6)',
          [userId, action, entity, req.params?.id || data?.id || null, JSON.stringify(details), req.headers['x-forwarded-for'] || req.socket?.remoteAddress]
        );
      } catch (e) { console.error('[Audit] Log failed:', e.message); }
    }
    return originalJson(data);
  };
  next();
};

module.exports = { auditLog };
