const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');
const { logAudit } = require('../utils/audit');

const CATEGORIES = {
  access:   ['%LOGIN%', '%LOGOUT%', '%PASSWORD%', '%SESSION%'],
  loans:    ['%LOAN%', '%DISBURSE%', '%WRITE_OFF%'],
  payments: ['%PAYMENT%', '%MATCH%', '%SUSPENSE%', '%RECOVERY%', '%FLOAT%'],
  funds:    ['%EXPENSE%', '%DRAWING%', '%CASH_COUNT%', '%RECEIPT%', '%CAPITAL%'],
  kyc:      ['%KYC%', '%DOCUMENT%'],
  admin:    ['%USER%', '%ROLE%', '%SETTING%', '%BRANCH%', '%EXPORT%']
};
const HIGH = ['%WRITE_OFF%', '%DELETE%', '%DRAWING%', '%DISBURSE%', '%REVOKE%', '%ROLE%', '%LOCK%'];
const MEDIUM = ['%APPROVE%', '%REJECT%', '%VERIFY%', '%CASH_COUNT%', '%SETTING%', '%USER%', '%SUSPENSE%', '%RECOVERY%', '%EXPORT%', '%FAILED%'];

const rx = (p) => new RegExp('^' + p.replace(/%/g, '.*') + '$', 'i');
const matches = (list, a) => list.some((p) => rx(p).test(a || ''));
const categoryOf = (a) => Object.keys(CATEGORIES).find((k) => matches(CATEGORIES[k], a)) || 'other';
const riskOf = (a, outcome) =>
  ((outcome && outcome !== 'success') || matches(HIGH, a)) ? 'high' : (matches(MEDIUM, a) ? 'medium' : 'low');

const readable = (d) => {
  if (d == null) return '';
  let o = d;
  if (typeof d === 'string') { try { o = JSON.parse(d); } catch { return d; } }
  if (o && typeof o === 'object') return o.message || JSON.stringify(o);
  return String(o);
};
const shape = (r) => ({ ...r, message: readable(r.details), category: categoryOf(r.action), risk: riskOf(r.action, r.outcome) });

// Times are stored in UTC; filter and group by Nairobi calendar day
const EAT = "((a.created_at AT TIME ZONE 'UTC') AT TIME ZONE 'Africa/Nairobi')";

// Admin sees everything; branch admins only see actions by users in their own branch
const scope = (req, params, where) => {
  if (!req.user.all_branches) {
    params.push(req.user.branch_id || 0);
    where.push(`u.branch_id = $${params.length}`);
  } else if (req.query.branch_id) {
    params.push(req.query.branch_id);
    where.push(`u.branch_id = $${params.length}`);
  }
};

const buildFilter = (req) => {
  const q = req.query;
  const params = [];
  const where = ['1=1'];
  scope(req, params, where);
  if (q.from) { params.push(q.from); where.push(`${EAT}::date >= $${params.length}::date`); }
  if (q.to) { params.push(q.to); where.push(`${EAT}::date <= $${params.length}::date`); }
  if (q.user_id) { params.push(q.user_id); where.push(`a.user_id = $${params.length}`); }
  if (q.outcome) { params.push(q.outcome); where.push(`a.outcome = $${params.length}`); }
  if (q.category && CATEGORIES[q.category]) {
    params.push(CATEGORIES[q.category]);
    where.push(`a.action ILIKE ANY($${params.length}::text[])`);
  }
  if (q.risk === 'high') {
    params.push(HIGH);
    where.push(`(a.action ILIKE ANY($${params.length}::text[]) OR a.outcome = 'failure')`);
  }
  if (q.q) {
    params.push('%' + q.q + '%'); const like = `$${params.length}`;
    params.push(String(q.q).replace(/^#/, '')); const exact = `$${params.length}`;
    where.push(`(a.user_name ILIKE ${like} OR a.action ILIKE ${like} OR a.details::text ILIKE ${like} OR a.entity ILIKE ${like} OR a.entity_id::text = ${exact})`);
  }
  return { where, params };
};

const FROM = 'FROM audit_logs a LEFT JOIN users u ON a.user_id = u.id';
const guard = [verifyToken, requireRole('admin', 'branch_admin', 'cfo')];

router.get('/', ...guard, async (req, res) => {
  try {
    const { where, params } = buildFilter(req);
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const total = parseInt((await pool.query(`SELECT COUNT(*) ${FROM} WHERE ${where.join(' AND ')}`, params)).rows[0].count);
    const r = await pool.query(
      `SELECT a.* ${FROM} WHERE ${where.join(' AND ')} ORDER BY a.id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, (page - 1) * limit]);
    res.json({ rows: r.rows.map(shape), total, page, pages: Math.max(Math.ceil(total / limit), 1) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/summary', ...guard, async (req, res) => {
  try {
    const sc = () => { const p = []; const w = ['1=1']; scope(req, p, w); return { p, w: w.join(' AND ') }; };

    const params = [HIGH]; const where = ['1=1']; scope(req, params, where);
    const counts = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE ${EAT}::date = (NOW() AT TIME ZONE 'Africa/Nairobi')::date) AS today,
         COUNT(*) FILTER (WHERE a.created_at >= NOW() - INTERVAL '7 days') AS week,
         COUNT(DISTINCT a.user_id) FILTER (WHERE a.created_at >= NOW() - INTERVAL '7 days') AS users_week,
         COUNT(*) FILTER (WHERE a.created_at >= NOW() - INTERVAL '30 days'
                          AND (a.action ILIKE ANY($1::text[]) OR a.outcome = 'failure')) AS high_30d,
         COUNT(*) FILTER (WHERE a.created_at >= NOW() - INTERVAL '30 days' AND a.outcome = 'failure') AS failures_30d
       ${FROM} WHERE ${where.join(' AND ')}`, params);

    const s1 = sc();
    const actions = await pool.query(
      `SELECT a.action, COUNT(*)::int AS c ${FROM} WHERE ${s1.w} AND a.created_at >= NOW() - INTERVAL '30 days' GROUP BY a.action`, s1.p);
    const by_category = {};
    actions.rows.forEach((r) => { const k = categoryOf(r.action); by_category[k] = (by_category[k] || 0) + r.c; });

    const s2 = sc();
    const top = await pool.query(
      `SELECT a.user_name AS name, COUNT(*)::int AS c ${FROM} WHERE ${s2.w} AND a.created_at >= NOW() - INTERVAL '30 days'
       GROUP BY a.user_name ORDER BY c DESC LIMIT 5`, s2.p);

    const s3 = sc();
    const users = await pool.query(
      `SELECT DISTINCT a.user_id AS id, a.user_name AS name ${FROM} WHERE ${s3.w} AND a.user_id IS NOT NULL ORDER BY name`, s3.p);

    const c = counts.rows[0];
    res.json({
      today: +c.today, week: +c.week, users_week: +c.users_week, high_30d: +c.high_30d, failures_30d: +c.failures_30d,
      by_category, top_users: top.rows, users: users.rows
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

const csv = (v) => {
  let s = String(v ?? '');
  if (/^[=+\-@]/.test(s)) s = "'" + s;   // stop spreadsheet formula injection
  return '"' + s.replace(/"/g, '""') + '"';
};

router.get('/export', ...guard, async (req, res) => {
  try {
    const { where, params } = buildFilter(req);
    const r = await pool.query(`SELECT a.* ${FROM} WHERE ${where.join(' AND ')} ORDER BY a.id DESC LIMIT 10000`, params);
    const head = ['Entry ID', 'Time (EAT)', 'User', 'Role', 'Action', 'Category', 'Risk', 'Outcome', 'Entity', 'Entity ID', 'IP address', 'Details'];
    const lines = [head.map(csv).join(',')].concat(r.rows.map((row) => {
      const s = shape(row);
      return [s.id, new Date(s.created_at).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' }), s.user_name, s.user_role,
        s.action, s.category, s.risk, s.outcome || 'success', s.entity, s.entity_id, s.ip_address, s.message].map(csv).join(',');
    }));
    await logAudit(req, { action: 'EXPORT_AUDIT', entity: 'audit_logs',
      details: { message: `Exported ${r.rows.length} audit entries`, filters: req.query } });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="audit-trail.csv"');
    res.send('\uFEFF' + lines.join('\r\n'));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;