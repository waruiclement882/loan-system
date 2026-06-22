const fs = require('fs');

// ─────────────────────────────────────────────
// 1. BACKEND - Reports route
// ─────────────────────────────────────────────
fs.writeFileSync('src/routes/reports.js', `const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/authMiddleware');
const pool = require('../db/connection');

// PAR Report
router.get('/par', verifyToken, async (req, res) => {
  try {
    const loans = await pool.query(
      "SELECT loans.*, customers.name as customer_name FROM loans LEFT JOIN customers ON loans.customer_id=customers.id WHERE loans.status='active'"
    );
    const overdue = await pool.query(
      "SELECT DISTINCT loan_id, MIN(due_date) as earliest_overdue, COUNT(*) as overdue_count FROM repayment_schedules WHERE status='overdue' GROUP BY loan_id"
    );
    const overdueMap = {};
    overdue.rows.forEach(r => { overdueMap[r.loan_id] = r; });

    const totalPortfolio = loans.rows.reduce((s, l) => s + parseFloat(l.balance || 0), 0);
    const overdueLoans = loans.rows.filter(l => overdueMap[l.id]);
    const overdueBalance = overdueLoans.reduce((s, l) => s + parseFloat(l.balance || 0), 0);
    const par = totalPortfolio > 0 ? ((overdueBalance / totalPortfolio) * 100).toFixed(2) : 0;

    const loanDetails = loans.rows.map(l => ({
      ...l,
      is_overdue: !!overdueMap[l.id],
      overdue_count: overdueMap[l.id]?.overdue_count || 0,
      earliest_overdue: overdueMap[l.id]?.earliest_overdue || null,
      days_overdue: overdueMap[l.id] ? Math.floor((new Date() - new Date(overdueMap[l.id].earliest_overdue)) / (1000*60*60*24)) : 0
    }));

    res.json({ par, totalPortfolio, overdueBalance, totalLoans: loans.rows.length, overdueLoans: overdueLoans.length, loans: loanDetails });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Loan Statement
router.get('/statement/:loan_id', verifyToken, async (req, res) => {
  try {
    const { loan_id } = req.params;
    const loanRes = await pool.query(
      'SELECT loans.*, customers.name as customer_name, customers.phone, customers.email, customers.national_id FROM loans LEFT JOIN customers ON loans.customer_id=customers.id WHERE loans.id=$1',
      [loan_id]
    );
    if (!loanRes.rows[0]) return res.status(404).json({ error: 'Loan not found' });
    const loan = loanRes.rows[0];

    const schedule = await pool.query('SELECT * FROM repayment_schedules WHERE loan_id=$1 ORDER BY installment_no', [loan_id]);
    const payments = await pool.query('SELECT * FROM payments WHERE loan_id=$1 ORDER BY payment_date', [loan_id]);

    res.json({ loan, schedule: schedule.rows, payments: payments.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Daily Collection Sheet
router.get('/collection', verifyToken, async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const due = await pool.query(
      \`SELECT rs.*, loans.customer_id, loans.amount as loan_amount, loans.balance,
        customers.name as customer_name, customers.phone
       FROM repayment_schedules rs
       JOIN loans ON rs.loan_id = loans.id
       JOIN customers ON loans.customer_id = customers.id
       WHERE rs.due_date::date = $1
       ORDER BY rs.status, customers.name\`,
      [targetDate]
    );

    const collected = due.rows.filter(r => r.status === 'paid').reduce((s, r) => s + parseFloat(r.amount_due), 0);
    const pending = due.rows.filter(r => r.status !== 'paid').reduce((s, r) => s + parseFloat(r.amount_due), 0);

    res.json({ date: targetDate, installments: due.rows, collected, pending, total: due.rows.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Audit Logs
router.get('/audit', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT audit_logs.*, users.name as user_name FROM audit_logs LEFT JOIN users ON audit_logs.user_id=users.id ORDER BY audit_logs.created_at DESC LIMIT 100'
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
`);

// ─────────────────────────────────────────────
// 2. BACKEND - Audit log middleware
// ─────────────────────────────────────────────
fs.writeFileSync('src/middlewares/auditMiddleware.js', `const pool = require('../db/connection');

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
`);

// ─────────────────────────────────────────────
// 3. BACKEND - Password reset route
// ─────────────────────────────────────────────
fs.writeFileSync('src/routes/passwordReset.js', `const express = require('express');
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
      html: \`<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <h2 style="color:#2563eb;">Password Reset</h2>
        <p>You requested a password reset. Click the link below to reset your password:</p>
        <a href="\${resetUrl}" style="background:#2563eb;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;margin:16px 0;">Reset Password</a>
        <p style="color:#666;font-size:12px;">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
      </div>\`
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
`);

// ─────────────────────────────────────────────
// 4. Update app.js to add new routes
// ─────────────────────────────────────────────
let app = fs.readFileSync('src/app.js', 'utf8');
if (!app.includes('reports')) {
  app = app.replace(
    'const webhookRoutes = require(\'./routes/webhooks\');',
    `const webhookRoutes = require('./routes/webhooks');
const reportRoutes = require('./routes/reports');
const passwordResetRoutes = require('./routes/passwordReset');`
  );
  app = app.replace(
    'app.use(\'/webhooks\', webhookRoutes);',
    `app.use('/webhooks', webhookRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/auth', passwordResetRoutes);`
  );
  fs.writeFileSync('src/app.js', app, 'utf8');
  console.log('app.js updated!');
}

console.log('Backend files created!');
