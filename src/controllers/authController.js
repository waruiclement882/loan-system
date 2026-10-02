const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../db/pool');
const emailService = require('../services/emailService');
const smsService = require('../services/smsService');

// ── JWT Secret validation on startup ─────────────────────────────────────────
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('❌ FATAL: JWT_SECRET must be set and at least 32 characters long');
  process.exit(1);
}

// ── Password strength validator ───────────────────────────────────────────────
const validatePassword = (password) => {
  const errors = [];
  if (!password || password.length < 8) errors.push('At least 8 characters');
  if (!/[A-Z]/.test(password)) errors.push('At least one uppercase letter');
  if (!/[0-9]/.test(password)) errors.push('At least one number');
  if (!/[!@#$%^&*(),.?":{}|<>_\-]/.test(password)) errors.push('At least one special character');
  return errors;
};

// ── Generate JWT token ────────────────────────────────────────────────────────
const generateToken = (user) => jwt.sign(
  { id: user.id, user_id: user.id, role: user.role, name: user.name },
  process.env.JWT_SECRET,
  { expiresIn: '24h' }
);

// ── Generate 6-digit OTP ──────────────────────────────────────────────────────
const generateOTP = () => String(crypto.randomInt(100000, 999999));

// ── Safe audit log ────────────────────────────────────────────────────────────
const audit = async (userId, userName, action, entity, entityId, message, extra = {}) => {
  try {
    const { password, token, secret, ...safeExtra } = extra;
    await pool.query(
      'INSERT INTO audit_logs (user_id, user_name, action, entity, entity_id, details) VALUES ($1,$2,$3,$4,$5,$6)',
      [userId, userName, action, entity, entityId, JSON.stringify({ message, ...safeExtra })]
    );
  } catch (e) { console.error('[Audit]', e.message); }
};

// ── STEP 1: Login — verify credentials, send OTP ─────────────────────────────
const login = async (req, res) => {
  try {
    const { email, password, method } = req.body; // method: 'email' or 'sms'

    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (!result.rows.length) return res.status(400).json({ error: 'Invalid credentials' });

    const user = result.rows[0];

    // Check if account is disabled
    if (user.is_active === false) return res.status(403).json({ error: 'Account disabled — contact admin' });

    // Check account lockout
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const minutesLeft = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
      return res.status(423).json({ error: `Account locked. Try again in ${minutesLeft} minute(s)` });
    }

    // Verify password
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      const attempts = (user.failed_login_attempts || 0) + 1;
      const shouldLock = attempts >= 5;
      await pool.query(
        'UPDATE users SET failed_login_attempts=$1, locked_until=$2 WHERE id=$3',
        [attempts, shouldLock ? new Date(Date.now() + 30 * 60000) : null, user.id]
      );
      await audit(user.id, user.name, 'LOGIN_FAILED', 'users', user.id, `Failed login attempt ${attempts}/5`);
      if (shouldLock) return res.status(423).json({ error: 'Too many failed attempts. Account locked for 30 minutes' });
      return res.status(400).json({ error: `Invalid credentials. ${5 - attempts} attempt(s) remaining` });
    }

    // ── 2FA: generate & send OTP ──────────────────────────────────────────────
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 3 * 60 * 1000); // 3 minutes
    const otpMethod = method || user.preferred_2fa || 'email';

    // Delete any existing unused OTPs for this user
    await pool.query('DELETE FROM otp_codes WHERE user_id = $1 AND used = FALSE', [user.id]);

    // Store new OTP
    await pool.query(
      'INSERT INTO otp_codes (user_id, code, method, expires_at) VALUES ($1, $2, $3, $4)',
      [user.id, otp, otpMethod, expiresAt]
    );

    // Send OTP
    if (otpMethod === 'sms') {
      if (!user.phone) return res.status(400).json({ error: 'No phone number on file. Use email instead.' });
      await smsService.sendSms(user.phone,
        `Your Blessed Ventures login code is: ${otp}. Valid for 3 minutes. Do not share this code.`
      );
      res.json({
        requires_otp: true,
        method: 'sms',
        message: `OTP sent to ${user.phone.slice(0, 4)}****${user.phone.slice(-3)}`,
        user_id: user.id
      });
    } else {
      await emailService.sendEmail({
        to: user.email,
        subject: 'Your Blessed Ventures Login Code',
        html: `
          <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#f9fafb;border-radius:12px;">
            <div style="background:#04342C;padding:20px;border-radius:8px;text-align:center;margin-bottom:24px;">
              <h2 style="color:#ffffff;margin:0;font-size:20px;">Blessed Ventures</h2>
              <p style="color:#A7F3D0;margin:4px 0 0;font-size:13px;">Microfinance System</p>
            </div>
            <h3 style="color:#1a1a1a;margin:0 0 8px;">Your Login Code</h3>
            <p style="color:#6b7280;font-size:14px;margin:0 0 20px;">Hi ${user.name}, use the code below to complete your login.</p>
            <div style="background:#ffffff;border:2px solid #04342C;border-radius:8px;padding:20px;text-align:center;margin-bottom:20px;">
              <p style="font-size:40px;font-weight:bold;color:#04342C;letter-spacing:12px;margin:0;">${otp}</p>
            </div>
            <p style="color:#ef4444;font-size:13px;text-align:center;">⏱ Expires in 3 minutes</p>
            <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:16px;">If you didn't request this, someone may be trying to access your account.</p>
          </div>
        `
      });
      res.json({
        requires_otp: true,
        method: 'email',
        message: `OTP sent to ${user.email.slice(0, 3)}****@${user.email.split('@')[1]}`,
        user_id: user.id
      });
    }

    // Reset failed attempts on successful password check
    await pool.query('UPDATE users SET failed_login_attempts=0, locked_until=NULL WHERE id=$1', [user.id]);

  } catch (err) {
    console.error('[Login]', err.message);
    res.status(500).json({ error: 'Login failed' });
  }
};

// ── STEP 2: Verify OTP — returns JWT ─────────────────────────────────────────
const verifyOtp = async (req, res) => {
  try {
    const { user_id, code } = req.body;

    if (!user_id || !code) return res.status(400).json({ error: 'user_id and code are required' });

    // Get latest unused OTP for this user
    const otpResult = await pool.query(
      `SELECT * FROM otp_codes
       WHERE user_id = $1 AND used = FALSE AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [user_id]
    );

    if (!otpResult.rows.length) {
      return res.status(400).json({ error: 'OTP expired or not found. Please login again.' });
    }

    const otp = otpResult.rows[0];

    // Constant-time comparison to prevent timing attacks
    const valid = crypto.timingSafeEqual(
      Buffer.from(otp.code.padEnd(6)),
      Buffer.from(String(code).padEnd(6))
    );

    if (!valid) {
      return res.status(400).json({ error: 'Invalid code. Please check and try again.' });
    }

    // Mark OTP as used
    await pool.query('UPDATE otp_codes SET used = TRUE WHERE id = $1', [otp.id]);

    // Get user and issue token
    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [user_id]);
    const user = userResult.rows[0];

    await pool.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

    const token = generateToken(user);

    await audit(user.id, user.name, 'LOGIN', 'users', user.id, `${user.name} logged in via 2FA (${otp.method})`);

    res.json({
      user: { id: user.id, name: user.name, full_name: user.full_name, email: user.email, role: user.role },
      token
    });

  } catch (err) {
    console.error('[VerifyOTP]', err.message);
    res.status(500).json({ error: 'Verification failed' });
  }
};

// ── Resend OTP ────────────────────────────────────────────────────────────────
const resendOtp = async (req, res) => {
  try {
    const { user_id, method } = req.body;
    if (!user_id) return res.status(400).json({ error: 'user_id required' });

    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [user_id]);
    if (!userResult.rows.length) return res.status(404).json({ error: 'User not found' });
    const user = userResult.rows[0];

    // Rate limit resend — max once per minute
    const recent = await pool.query(
      'SELECT created_at FROM otp_codes WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1',
      [user_id]
    );
    if (recent.rows.length && new Date() - new Date(recent.rows[0].created_at) < 60000) {
      return res.status(429).json({ error: 'Please wait 1 minute before requesting a new code' });
    }

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 3 * 60 * 1000);
    const otpMethod = method || user.preferred_2fa || 'email';

    await pool.query('DELETE FROM otp_codes WHERE user_id=$1 AND used=FALSE', [user_id]);
    await pool.query('INSERT INTO otp_codes (user_id, code, method, expires_at) VALUES ($1,$2,$3,$4)',
      [user_id, otp, otpMethod, expiresAt]);

    if (otpMethod === 'sms') {
      await smsService.sendSms(user.phone, `Your Blessed Ventures login code is: ${otp}. Valid for 3 minutes.`);
    } else {
      await emailService.sendEmail({
        to: user.email,
        subject: 'Your New Login Code — Blessed Ventures',
        html: `<div style="font-family:Arial;padding:24px;text-align:center;"><h2>New Login Code</h2><p style="font-size:36px;font-weight:bold;color:#04342C;letter-spacing:10px;">${otp}</p><p style="color:#ef4444;">Expires in 3 minutes</p></div>`
      });
    }

    res.json({ message: `New OTP sent via ${otpMethod}` });
  } catch (err) {
    console.error('[ResendOTP]', err.message);
    res.status(500).json({ error: 'Failed to resend OTP' });
  }
};

// ── Register ──────────────────────────────────────────────────────────────────
const register = async (req, res) => {
  try {
    const { name, full_name, email, password, role, phone } = req.body;
    const displayName = full_name || name;
    if (!email || !password || !displayName) return res.status(400).json({ error: 'Name, email and password are required' });
    const pwErrors = validatePassword(password);
    if (pwErrors.length) return res.status(400).json({ error: 'Password too weak', requirements: pwErrors });
    const allowedRoles = ['loan_officer', 'cashier'];
    const userRole = allowedRoles.includes(role) ? role : 'loan_officer';
    const exists = await pool.query('SELECT id FROM users WHERE email=$1', [email]);
    if (exists.rows.length) return res.status(400).json({ error: 'Email already exists' });
    const hashed = await bcrypt.hash(password, 12);
    const result = await pool.query(
      'INSERT INTO users (name, full_name, email, password, role, phone, password_changed_at) VALUES ($1,$2,$3,$4,$5,$6,NOW()) RETURNING id,name,full_name,email,role',
      [displayName, displayName, email, hashed, userRole, phone || null]
    );
    const token = generateToken(result.rows[0]);
    await audit(result.rows[0].id, displayName, 'USER_CREATED', 'users', result.rows[0].id, `New user: ${email} as ${userRole}`);
    res.status(201).json({ user: result.rows[0], token });
  } catch (err) {
    console.error('[Register]', err.message);
    res.status(500).json({ error: 'Registration failed' });
  }
};

// ── Forgot Password ───────────────────────────────────────────────────────────
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });
    const result = await pool.query('SELECT * FROM users WHERE email=$1', [email]);
    if (!result.rows.length) return res.json({ message: 'If this email exists, a reset link has been sent.' });
    const user = result.rows[0];
    const resetToken = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
    await pool.query("UPDATE users SET reset_token=$1, reset_token_expiry=NOW()+INTERVAL '1 hour' WHERE id=$2", [resetToken, user.id]);
    const frontendUrl = process.env.FRONTEND_URL || 'https://loan-frontend-xo0d.onrender.com';
    await emailService.sendEmail({
      to: email,
      subject: 'Password Reset — Blessed Ventures',
      html: `<div style="font-family:Arial;padding:24px;"><h2>Password Reset</h2><p>Hi ${user.name},</p><p>Click below to reset your password:</p><a href="${frontendUrl}/reset-password?token=${resetToken}" style="display:inline-block;background:#04342C;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;">Reset Password</a><p style="color:#6b7280;font-size:13px;margin-top:16px;">Expires in 1 hour.</p></div>`
    });
    res.json({ message: 'If this email exists, a reset link has been sent.' });
  } catch (err) {
    console.error('[ForgotPassword]', err.message);
    res.status(500).json({ error: 'Failed to process request' });
  }
};

// ── Reset Password ────────────────────────────────────────────────────────────
const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Token and password are required' });
    const pwErrors = validatePassword(password);
    if (pwErrors.length) return res.status(400).json({ error: 'Password too weak', requirements: pwErrors });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result = await pool.query('SELECT * FROM users WHERE id=$1 AND reset_token=$2 AND reset_token_expiry>NOW()', [decoded.id, token]);
    if (!result.rows.length) return res.status(400).json({ error: 'Invalid or expired reset token' });
    const hashed = await bcrypt.hash(password, 12);
    await pool.query('UPDATE users SET password=$1, reset_token=NULL, reset_token_expiry=NULL, password_changed_at=NOW(), failed_login_attempts=0, locked_until=NULL WHERE id=$2', [hashed, decoded.id]);
    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    res.status(400).json({ error: 'Invalid or expired reset token' });
  }
};

// ── Get Users ─────────────────────────────────────────────────────────────────
const getUsers = async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, full_name, email, role, is_active, last_login, failed_login_attempts, locked_until, password_changed_at, created_at FROM users ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

module.exports = { register, login, verifyOtp, resendOtp, forgotPassword, resetPassword, getUsers };
