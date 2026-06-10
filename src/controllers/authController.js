const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const emailService = require('../services/emailService');

// ── Helper: generate token ────────────────────────────────────────────────────
const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, user_id: user.id, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: '24h' } // reduced from 7d to 24h
  );
};

// ── Register ──────────────────────────────────────────────────────────────────
const register = async (req, res) => {
  try {
    const { name, full_name, email, password, role } = req.body;
    const displayName = full_name || name;

    // ✅ Security: never allow self-registration as admin
    const allowedRoles = ['loan_officer', 'cashier'];
    const userRole = allowedRoles.includes(role) ? role : 'loan_officer';

    if (!email || !password || !displayName) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const userExists = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 12); // increased from 10 to 12 rounds
    const result = await pool.query(
      'INSERT INTO users (name, full_name, email, password, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, full_name, email, role, created_at',
      [displayName, displayName, email, hashedPassword, userRole]
    );

    const token = generateToken(result.rows[0]);
    res.status(201).json({ user: result.rows[0], token });
  } catch (error) {
    console.error('[Register]', error.message);
    res.status(500).json({ error: 'Registration failed' });
  }
};

// ── Login ─────────────────────────────────────────────────────────────────────
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    // ✅ Security: same error message for wrong email or wrong password
    // (prevents user enumeration attacks)
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Check if account is active
    if (user.is_active === false) {
      return res.status(403).json({ error: 'Account disabled — contact admin' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      // Log failed attempt
      pool.query(
        'INSERT INTO audit_logs (user_id, user_name, action, entity, entity_id, details) VALUES ($1,$2,$3,$4,$5,$6)',
        [user.id, user.name, 'LOGIN_FAILED', 'users', user.id,
         JSON.stringify({ message: `Failed login attempt for ${user.email}` })]
      ).catch(() => {});
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user);

    res.json({
      user: {
        id: user.id,
        name: user.name,
        full_name: user.full_name,
        email: user.email,
        role: user.role
      },
      token
    });

    // Log successful login
    pool.query(
      'INSERT INTO audit_logs (user_id, user_name, action, entity, entity_id, details) VALUES ($1,$2,$3,$4,$5,$6)',
      [user.id, user.name, 'LOGIN', 'users', user.id,
       JSON.stringify({ message: `${user.name} logged in` })]
    ).catch(e => console.error('[Audit]', e.message));

  } catch (error) {
    console.error('[Login]', error.message);
    res.status(500).json({ error: 'Login failed' });
  }
};

// ── Forgot Password ───────────────────────────────────────────────────────────
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) return res.status(400).json({ error: 'Email is required' });

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    // ✅ Security: always return same message (prevents email enumeration)
    if (result.rows.length === 0) {
      return res.json({ message: 'If this email exists, a reset link has been sent.' });
    }

    const user = result.rows[0];
    const resetToken = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    await pool.query(
      "UPDATE users SET reset_token = $1, reset_token_expiry = NOW() + INTERVAL '1 hour' WHERE id = $2",
      [resetToken, user.id]
    );

    const frontendUrl = process.env.FRONTEND_URL || 'https://loan-frontend-xo0d.onrender.com';
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

    await emailService.sendEmail({
      to: email,
      subject: 'Password Reset Request',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
          <h2 style="color:#2563eb">Password Reset</h2>
          <p>Hello ${user.name},</p>
          <p>You requested a password reset. Click the button below:</p>
          <a href="${resetLink}" style="display:inline-block;background:#2563eb;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;margin:16px 0">Reset Password</a>
          <p style="color:#6b7280;font-size:14px">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
        </div>
      `
    });

    res.json({ message: 'If this email exists, a reset link has been sent.' });
  } catch (error) {
    console.error('[ForgotPassword]', error.message);
    res.status(500).json({ error: 'Failed to process request' });
  }
};

// ── Reset Password ────────────────────────────────────────────────────────────
const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: 'Token and password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result = await pool.query(
      'SELECT * FROM users WHERE id = $1 AND reset_token = $2 AND reset_token_expiry > NOW()',
      [decoded.id, token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    await pool.query(
      'UPDATE users SET password = $1, reset_token = NULL, reset_token_expiry = NULL WHERE id = $2',
      [hashedPassword, decoded.id]
    );

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    res.status(400).json({ error: 'Invalid or expired reset token' });
  }
};

// ── Get Users (admin only) ────────────────────────────────────────────────────
const getUsers = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, full_name, email, role, created_at FROM users ORDER BY id DESC'
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { register, login, forgotPassword, resetPassword, getUsers };
