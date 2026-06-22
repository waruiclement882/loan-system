const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

// GET all float transactions
router.get('/', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT ft.*, u.name AS recorded_by_name
      FROM float_income ft
      LEFT JOIN users u ON ft.recorded_by = u.id
      ORDER BY ft.transaction_date DESC
    `);
    const totalProfit = result.rows.reduce((s, r) => s + parseFloat(r.profit || 0), 0);
    const totalGivenOut = result.rows.reduce((s, r) => s + parseFloat(r.amount_given || 0), 0);
    const totalReturned = result.rows.reduce((s, r) => s + parseFloat(r.amount_returned || 0), 0);
    res.json({ transactions: result.rows, totalProfit, totalGivenOut, totalReturned });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST record a float transaction
router.post('/', verifyToken, async (req, res) => {
  try {
    const { person_name, amount_given, amount_returned, notes, transaction_date } = req.body;
    const recorded_by = req.user?.id || req.user?.user_id;

    if (!person_name || !amount_given || !amount_returned) {
      return res.status(400).json({ error: 'person_name, amount_given and amount_returned are required' });
    }

    const profit = parseFloat(amount_returned) - parseFloat(amount_given);
    if (profit < 0) {
      return res.status(400).json({ error: 'Amount returned must be greater than amount given' });
    }

    const result = await pool.query(`
      INSERT INTO float_income 
        (person_name, amount_given, amount_returned, profit, notes, transaction_date, recorded_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      person_name, amount_given, amount_returned, profit,
      notes || null,
      transaction_date || new Date().toISOString().split('T')[0],
      recorded_by
    ]);

    // Record in company income for reporting
    await pool.query(`
      INSERT INTO company_income (amount, type, transaction_code, recorded_by, notes)
      VALUES ($1, 'float_income', $2, $3, $4)
    `, [
      profit,
      `FLOAT-${Date.now()}`,
      recorded_by,
      `Float income from ${person_name}: gave KSh ${amount_given}, returned KSh ${amount_returned}`
    ]);

    res.status(201).json({ message: 'Float transaction recorded', data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE a float transaction
router.delete('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM float_income WHERE id = $1', [req.params.id]);
    res.json({ message: 'Float transaction deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Match a bank transaction as float income
router.post('/match', verifyToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { transaction_id, person_name, amount_given, notes } = req.body;
    const recorded_by = req.user?.id || req.user?.user_id;

    await client.query('BEGIN');

    const txResult = await client.query(
      'SELECT * FROM bank_transactions WHERE id = $1 AND status = $2',
      [transaction_id, 'received']
    );
    if (txResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Transaction not found or already matched' });
    }
    const tx = txResult.rows[0];
    const amountReturned = parseFloat(tx.amount);
    const amountGiven = parseFloat(amount_given);
    const profit = amountReturned - amountGiven;

    if (profit < 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Amount returned must be greater than amount given' });
    }

    // Record float transaction
    await client.query(`
      INSERT INTO float_income 
        (person_name, amount_given, amount_returned, profit, notes, transaction_date, recorded_by)
      VALUES ($1, $2, $3, $4, $5, NOW(), $6)
    `, [person_name || tx.customer_name, amountGiven, amountReturned, profit, notes || null, recorded_by]);

    // Record profit in company income
    await client.query(`
      INSERT INTO company_income (amount, type, transaction_code, recorded_by, notes)
      VALUES ($1, 'float_income', $2, $3, $4)
    `, [
      profit, tx.transaction_reference, recorded_by,
      `Float income from ${person_name || tx.customer_name}: gave KSh ${amountGiven}, returned KSh ${amountReturned}`
    ]);

    // Mark bank transaction as processed
    await client.query(
      `UPDATE bank_transactions SET status = 'processed', processed_at = NOW() WHERE id = $1`,
      [transaction_id]
    );

    await client.query('COMMIT');
    res.json({ message: 'Float income matched successfully', profit });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
