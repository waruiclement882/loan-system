const pool = require('../db/pool');

const clientIp = (req) =>
  ((req.headers && req.headers['x-forwarded-for']) || '').split(',')[0].trim() || req.ip || null;

// Never throws: a logging failure must not break the action being logged.
const logAudit = async (req, { action, entity, entityId, details, oldValues, newValues, outcome = 'success' }) => {
  try {
    const u = req.user || {};
    const body = typeof details === 'string' ? { message: details } : (details || {});
    await pool.query(
      `INSERT INTO audit_logs
         (user_id, user_name, user_role, branch_id, action, entity, entity_id, details,
          old_values, new_values, ip_address, outcome)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [u.id || u.user_id || null, u.name || u.full_name || 'System', u.real_role || u.role || null, u.branch_id || null,
       action, entity || null, entityId || null, JSON.stringify(body),
       oldValues ? JSON.stringify(oldValues) : null,
       newValues ? JSON.stringify(newValues) : null,
       clientIp(req), outcome]
    );
  } catch (e) { console.error('[Audit]', e.message); }
};

module.exports = { logAudit, clientIp };