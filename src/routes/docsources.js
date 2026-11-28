const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

const guard = [verifyToken, requireRole('admin', 'super_admin', 'branch_admin', 'cashier', 'cfo')];
const seesAll = (u) => ['admin', 'super_admin', 'cfo'].includes(u.role) || u.real_role === 'super_admin';
const rows = async (sql, p = []) => (await pool.query(sql, p)).rows;
const live = (type, col) => `(SELECT d.id FROM documents d WHERE d.doc_type = '${type}' AND d.source_id = ${col} AND d.status = 'issued' LIMIT 1) AS doc_id`;

router.get('/sources', ...guard, async (req, res) => {
  try {
    const u = req.user;
    const all = seesAll(u);
    const p = all ? [] : [parseInt(u.branch_id) || 1];
    const scope = (col) => (all ? 'TRUE' : `COALESCE(${col}, 1) = $1`);
    const manager = ['admin', 'super_admin', 'branch_admin'].includes(u.role);

    const paid_loans = await rows(
      `SELECT l.id, c.name, l.total_amount, ${live('clearance_certificate', 'l.id')}
       FROM loans l JOIN customers c ON c.id = l.customer_id
       WHERE l.status = 'paid' AND ${scope('l.branch_id')} ORDER BY l.id DESC LIMIT 25`, p);
    const written_off = manager ? await rows(
      `SELECT l.id, c.name, l.balance, ${live('write_off_memo', 'l.id')}
       FROM loans l JOIN customers c ON c.id = l.customer_id
       WHERE l.status = 'written_off' AND ${scope('l.branch_id')} ORDER BY l.id DESC LIMIT 25`, p) : [];
    const drawings = u.real_role === 'super_admin' ? await rows(
      `SELECT x.id, x.amount, x.purpose, x.drawing_date, ${live('drawing_voucher', 'x.id')}
       FROM owner_drawings x WHERE ${scope('x.branch_id')} ORDER BY x.id DESC LIMIT 20`, p) : [];
    const counts = await rows(
      `SELECT x.id, x.recon_date, x.expected_cash, x.counted_cash, x.variance, ${live('cash_count_sheet', 'x.id')}
       FROM cash_reconciliations x WHERE ${scope('x.branch_id')} ORDER BY x.id DESC LIMIT 20`, p);
    const suspense = await rows(
      `SELECT x.id, x.amount, x.type, c.name, ${live('suspense_slip', 'x.id')}
       FROM suspense_account x LEFT JOIN customers c ON c.id = x.customer_id
       WHERE ${scope('c.branch_id')} ORDER BY x.id DESC LIMIT 20`, p);
    const capital = u.role === 'admin' ? await rows(
      `SELECT x.id, x.amount, x.kind, x.movement_date, x.description, ${live('capital_receipt', 'x.id')}
       FROM capital_movements x WHERE x.kind <> 'adjustment' ORDER BY x.id DESC LIMIT 20`) : [];
    const branches = all ? await rows('SELECT id, name FROM branches WHERE is_active = TRUE ORDER BY id') : [];
    res.json({ paid_loans, written_off, drawings, counts, suspense, capital, branches });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;