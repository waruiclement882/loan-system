require('dotenv').config();
const pool = require('./src/db/pool');

async function setRoles() {
  try {
    // Set John as admin
    const r1 = await pool.query(
      "UPDATE users SET role = 'admin' WHERE email = 'john@example.com' RETURNING id, name, email, role"
    );
    if (r1.rows.length > 0) {
      console.log('✅ Admin set:', r1.rows[0]);
    } else {
      console.log('⚠️  john@example.com not found');
    }

    // Show all users and their current roles
    const all = await pool.query('SELECT id, name, email, role FROM users ORDER BY id');
    console.log('\n📋 All users:');
    console.table(all.rows);

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

setRoles();
