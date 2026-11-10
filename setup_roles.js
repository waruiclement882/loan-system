require("dotenv").config();
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  const hash = await bcrypt.hash("StrongPasswordMixOfLetters!1", 10);

  // Create CFO user
  const cfo = await pool.query(
    "INSERT INTO users (name, email, password, role, is_active, two_fa_enabled, preferred_2fa) VALUES ($1,$2,$3,$4,true,true,$5) ON CONFLICT (email) DO NOTHING RETURNING id, name, role",
    ["CFO Clement", "cfo@lunarlumina.co.ke", hash, "cfo", "email"]
  );
  console.log("CFO created:", cfo.rows);

  // Update your main admin to super_admin
  const sa = await pool.query(
    "UPDATE users SET role = $1 WHERE email = $2 RETURNING id, name, email, role",
    ["super_admin", "waruiclement882@gmail.com"]
  );
  console.log("super_admin:", sa.rows);

  // Show all users and roles
  const all = await pool.query("SELECT id, name, email, role FROM users ORDER BY role");
  console.log("All users:");
  all.rows.forEach(u => console.log(" ", u.id, u.role, u.name, u.email));
  pool.end();
}
run().catch(e => { console.error(e.message); pool.end(); });
