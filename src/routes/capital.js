const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');
const { logAudit } = require('../utils/audit');

const readers = [verifyToken, requireRole('admin', 'super_admin', 'cfo')];
const requireSuper = (req, res, next) => (req.user && req.user.real_role === 'super_admin')
  ? next() : res.status(403).json({ error: 'Only the super admin can record capital' });

router.get('/', ...readers, async (req, res) => {
  try {
    const params = []; let where = 'TRUE';
    if (req.query.branch_id) { params.push(req.query.branch_id); where = 'm.branch_id = $1'; }
    const r = await pool.query(
      `SELECT m.*, u.name AS recorded_by_name, b.name AS branch_name,
         (SELECT d.id FROM documents d WHERE d.doc_type = 'capital_receipt' AND d.source_id = m.id AND d.status = 'issued' LIMIT 1) AS doc_id
       FROM capital_movements m LEFT JOIN users u ON u.id = m.recorded_by LEFT JOIN branches b ON b.id = m.branch_id
       WHERE ${where} ORDER BY m.movement_date DESC, m.id DESC LIMIT 200`, params);
    const totals = await pool.query('SELECT branch_id, SUM(amount) AS total FROM capital_movements GROUP BY branch_id ORDER BY branch_id');
    res.json({ movements: r.rows, totals: totals.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', verifyToken, requireSuper, async (req, res) => {
  const client = await pool.connect();
  try {
    const kind = req.body.kind === 'adjustment' ? 'adjustment' : 'contribution';
    const branchId = parseInt(req.body.branch_id) || 1;
    const amount = parseFloat(req.body.amount);
    const description = String(req.body.description || '').trim();
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' });
    const date = req.body.movement_date || today;
    if (!amount || (kind === 'contribution' && amount <= 0)) return res.status(400).json({ error: 'Enter a valid amount' });
    if (description.length < (kind === 'adjustment' ? 15 : 5)) return res.status(400).json({ error: kind === 'adjustment' ? 'Explain the adjustment in a full sentence' : 'Describe where the money came from' });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > today) return res.status(400).json({ error: 'The date cannot be in the future' });
    const br = await client.query('SELECT id FROM branches WHERE id = $1', [branchId]);
    if (!br.rows[0]) return res.status(404).json({ error: 'Branch not found' });

    await client.query('BEGIN');
    await client.query("SET LOCAL app.capital_update = 'on'");
    const ins = await client.query(
      `INSERT INTO capital_movements (branch_id, kind, amount, movement_date, description, reference, recorded_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [branchId, kind, amount, date, description, req.body.reference || null, req.user.id || req.user.user_id]);
    await client.query(
      'UPDATE branches SET capital = (SELECT COALESCE(SUM(amount),0) FROM capital_movements WHERE branch_id = $1) WHERE id = $1', [branchId]);
    await client.query('COMMIT');

    await logAudit(req, { action: 'CAPITAL_' + kind.toUpperCase(), entity: 'capital_movements', entityId: ins.rows[0].id,
      details: { message: `Capital ${kind} of KSh ${amount} for branch ${branchId}: ${description}`, branch_id: branchId }, newValues: ins.rows[0] });
    res.status(201).json({ message: kind === 'adjustment' ? 'Adjustment recorded' : 'Contribution recorded', movement: ins.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    res.status(500).json({ error: err.message });
  } finally { client.release(); }
});

module.exports = router;