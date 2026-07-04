const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const emailService = require('../services/emailService');

// ── 1. JWT Secret validation on startup ──────────────────────────────────────
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('❌ FATAL: JWT_SECRET must be set and at least 32 characters long');
  process.exit(1);
}

// ── 2. Password strength validator ───────────────────────────────────────────
const validatePassword = (password) => {
  const errors = [];
  if (!password || password.length < 8) errors.push('At least 8 characters');
  if (!/[A-Z]/.test(password)) errors.push('At least one uppercase letter');
  if (!/[0-9]/.test(password)) errors.push('At least one number');
  if (!/[!@#$%^&*(),.?":{}|<>_\-]/.test(password)) errors.push('At least one special character (!@#$%...)');
  return errors;
};

// ── 3. Generate token ─────────────────────────────────────────────────────────
const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, user_id: user.id, role: user.role, name: user.name, branch_id: user.branch_id },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
};

// ── 4. Safe audit log — never store passwords or sensitive fields ─────────────
const safeAuditLog = async (userId, userName, action, entity, entityId, message, extra = {}) => {
  try {
    // Strip sensitive fields from extra data
    const { password, token, secret, api_key, ...safeExtra } = extra;
    await pool.query(
      'INSERT INTO audit_logs (user_id, user_name, action, entity, entity_id, details) VALUES ($1,$2,$3,$4,$5,$6)',
      [userId, userName, action, entity, entityId,
       JSON.stringify({ message, ...safeExtra })]
    );
  } catch (e) {
    console.error('[Audit]', e.message);
  }
};

// ── 5. Register ───────────────────────────────────────────────────────────────
const register = async (req, res) => {
  try {
    const { name, full_name, email, password, role } = req.body;
    const displayName = full_name || name;

    if (!email || !password || !displayName) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }

    // Password strength check
    const pwErrors = validatePassword(password);
    if (pwErrors.length > 0) {
      return res.status(400).json({ error: 'Password too weak', requirements: pwErrors });
    }

    // Never allow self-registration as admin
    const allowedRoles = ['loan_officer', 'cashier'];
    const userRole = allowedRoles.includes(role) ? role : 'loan_officer';

    const userExists = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const result = await pool.query(
      'INSERT INTO users (name, full_name, email, password, role, password_changed_at) VALUES ($1,$2,$3,$4,$5,NOW()) RETURNING id, name, full_name, email, role, created_at',
      [displayName, displayName, email, hashedPassword, userRole]
    );

    const token = generateToken(result.rows[0]);

    await safeAuditLog(result.rows[0].id, displayName, 'USER_CREATED', 'users', result.rows[0].id,
      `New user registered: ${email} as ${userRole}`, { email, role: userRole });

    res.status(201).json({ user: result.rows[0], token });
  } catch (error) {
    console.error('[Register]', error.message);
    res.status(500).json({ error: 'Registration failed' });
  }
};

// ── 6. Login with account locking ────────────────────────────────────────────
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 30;

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    // Same error for wrong email or wrong password (prevents enumeration)
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Check if account is disabled
    if (user.is_active === false) {
      return res.status(403).json({ error: 'Account disabled — contact admin' });
    }

    // Check if account is locked
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const minutesLeft = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
      return res.status(423).json({
        error: `Account locked due to too many failed attempts. Try again in ${minutesLeft} minute(s)`
      });
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      const newFailedAttempts = (user.failed_login_attempts || 0) + 1;
      const shouldLock = newFailedAttempts >= MAX_FAILED_ATTEMPTS;

      await pool.query(
        `UPDATE users SET
           failed_login_attempts = $1,
           locked_until = $2
         WHERE id = $3`,
        [
          newFailedAttempts,
          shouldLock ? new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000) : null,
          user.id
        ]
      );

      await safeAuditLog(user.id, user.name, 'LOGIN_FAILED', 'users', user.id,
        `Failed login attempt ${newFailedAttempts}/${MAX_FAILED_ATTEMPTS} for ${email}`,
        { attempts: newFailedAttempts, locked: shouldLock });

      if (shouldLock) {
        return res.status(423).json({
          error: `Too many failed attempts. Account locked for ${LOCK_DURATION_MINUTES} minutes`
        });
      }

      const attemptsLeft = MAX_FAILED_ATTEMPTS - newFailedAttempts;
      return res.status(400).json({
        error: `Invalid credentials. ${attemptsLeft} attempt(s) remaining before lockout`
      });
    }

    // ✅ Successful login — reset failed attempts
    await pool.query(
      'UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login = NOW() WHERE id = $1',
      [user.id]
    );

    const token = generateToken(user);

    res.json({
      user: {
        id: user.id,
        name: user.name,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        branch_id: user.branch_id
      },
      token
    });

    await safeAuditLog(user.id, user.name, 'LOGIN', 'users', user.id,
      `${user.name} logged in successfully`);

  } catch (error) {
    console.error('[Login]', error.message);
    res.status(500).json({ error: 'Login failed' });
  }
};

// ── 7. Forgot Password ────────────────────────────────────────────────────────
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    // Always return same message
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

    await safeAuditLog(user.id, user.name, 'PASSWORD_RESET_REQUESTED', 'users', user.id,
      `Password reset requested for ${email}`);

    res.json({ message: 'If this email exists, a reset link has been sent.' });
  } catch (error) {
    console.error('[ForgotPassword]', error.message);
    res.status(500).json({ error: 'Failed to process request' });
  }
};

// ── 8. Reset Password ─────────────────────────────────────────────────────────
const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: 'Token and password are required' });
    }

    // Password strength check
    const pwErrors = validatePassword(password);
    if (pwErrors.length > 0) {
      return res.status(400).json({ error: 'Password too weak', requirements: pwErrors });
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
      'UPDATE users SET password = $1, reset_token = NULL, reset_token_expiry = NULL, password_changed_at = NOW(), failed_login_attempts = 0, locked_until = NULL WHERE id = $2',
      [hashedPassword, decoded.id]
    );

    await safeAuditLog(decoded.id, result.rows[0].name, 'PASSWORD_RESET', 'users', decoded.id,
      'Password reset successfully');

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    res.status(400).json({ error: 'Invalid or expired reset token' });
  }
};

// ── 9. Get Users (admin only) ─────────────────────────────────────────────────
const getUsers = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, full_name, email, role, is_active,
              last_login, failed_login_attempts, locked_until,
              password_changed_at, created_at
       FROM users ORDER BY id DESC`
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { register, login, forgotPassword, resetPassword, getUsers };
