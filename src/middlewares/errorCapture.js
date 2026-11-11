const pool = require('../db/pool');

// Records every HTTP 5xx response (method, path, message) into error_logs so
// the AI assistant, and you, can see which endpoints are failing.
module.exports = function errorCapture(req, res, next) {
  const originalJson = res.json.bind(res);

  res.json = (body) => {
    try {
      if (res.statusCode >= 500) {
        const message = String((body && (body.error || body.message)) || '').slice(0, 500);
        const route = String(req.originalUrl || req.url || '').split('?')[0].slice(0, 300);
        pool
          .query(
            'INSERT INTO error_logs (method, path, status_code, message, user_id) VALUES ($1,$2,$3,$4,$5)',
            [req.method, route, res.statusCode, message, req.user?.id || null]
          )
          .catch(() => {});
      }
    } catch {}
    return originalJson(body);
  };

  next();
};
