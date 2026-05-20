const fs = require('fs');

const controller = `const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');

const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    const userExists = await pool.query(
      'SELECT * FROM users WHERE email = $1', [email]
    );
    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role',
      [name, email, hashedPassword, role || 'loan_officer']
    );

    const token = jwt.sign(
      { id: result.rows[0].id, role: result.rows[0].role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({ user: result.rows[0], token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1', [email]
    );
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, result.rows[0].password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      user: {
        id:    user.id,
        name:  user.name,
        email: user.email,
        role:  user.role || 'admin',   // fallback for existing users with no role set
      },
      token,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { register, login };
`;

fs.writeFileSync('src/controllers/authController.js', controller);
console.log('✅ authController.js updated — role now returned on login');
console.log('');
console.log('John Kamau (john@example.com) currently has no role set in DB.');
console.log('Run this SQL on your Render Postgres to set him as admin:');
console.log('');
console.log("  UPDATE users SET role = 'admin' WHERE email = 'john@example.com';");
console.log('');
console.log('You can run it via Render dashboard → your DB → Query tab.');
