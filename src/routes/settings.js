const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

// Get settings
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM company_settings LIMIT 1');
    res.json(result.rows[0] || {});
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Update settings (admin only)
router.put('/', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { company_name, tagline, phone, email, address, logo_url, primary_color, paybill, account_number, max_loans_per_customer, max_loan_amount } = req.body;
    const result = await pool.query(
      `UPDATE company_settings SET
        company_name = COALESCE($1, company_name),
        tagline = COALESCE($2, tagline),
        phone = COALESCE($3, phone),
        email = COALESCE($4, email),
        address = COALESCE($5, address),
        logo_url = COALESCE($6, logo_url),
        primary_color = COALESCE($7, primary_color),
        paybill = COALESCE($8, paybill),
        account_number = COALESCE($9, account_number),
        max_loans_per_customer = COALESCE($10, max_loans_per_customer),
        max_loan_amount = COALESCE($11, max_loan_amount),
        updated_at = NOW()
       WHERE id = 1 RETURNING *`,
      [company_name, tagline, phone, email, address, logo_url, primary_color, paybill, account_number, max_loans_per_customer, max_loan_amount]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;