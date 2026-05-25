const express = require('express');
const router = express.Router();
const pool = require('../db/connection');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { sendEmail } = require('../services/emailService');

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await pool.query('SELECT * FROM users WHERE email=$1', [email]);
    if (!user.rows[0]) return res.json({ message: 'If email exists, reset link sent' });

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600000); // 1 hour

    await pool.query(
      'UPDATE users SET reset_token=$1, reset_token_expires=$2 WHERE email=$3',
      [token, expires, email]
    );

    const resetUrl = (process.env.FRONTEND_URL || 'https://loan-frontend-xo0d.onrender.com') + '/reset-password?token=' + token;

    await sendEmail({
      to: email,
      subject: 'Password Reset Request',
      html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <h2 style="color:#2563eb;">Password Reset</h2>
        <p>You requested a password reset. Click the link below to reset your password:</p>
        <a href="${resetUrl}" style="background:#2563eb;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;margin:16px 0;">Reset Password</a>
        <p style="color:#666;font-size:12px;">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
      </div>`
    });

    res.json({ message: 'If email exists, reset link sent' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    const user = await pool.query(
      'SELECT * FROM users WHERE reset_token=$1 AND reset_token_expires > NOW()',
      [token]
    );
    if (!user.rows[0]) return res.status(400).json({ error: 'Invalid or expired reset token' });

    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      'UPDATE users SET password=$1, reset_token=NULL, reset_token_expires=NULL WHERE id=$2',
      [hash, user.rows[0].id]
    );

    res.json({ message: 'Password reset successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
