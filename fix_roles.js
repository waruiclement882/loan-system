require("dotenv").config();
const { Pool } = require("pg");
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  // Delete the duplicate CFO user
  await pool.query("DELETE FROM users WHERE email = $1", ["cfo@lunarlumina.co.ke"]);
  console.log("Duplicate CFO deleted");

  // Show final users
  const all = await pool.query("SELECT id, name, email, role FROM users ORDER BY role");
  console.log("Final users:");
  all.rows.forEach(u => console.log(" ", u.id, u.role, u.name, u.email));
  pool.end();
}
run().catch(e => { console.error(e.message); pool.end(); });
