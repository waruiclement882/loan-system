require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  // Find Siscar's loan
  console.log('\n=== FINDING SISCAR LOAN ===');
  const siscar = await pool.query(`
    SELECT l.id, l.amount, l.status, l.term_weeks, l.total_amount, l.weekly_installment,
           l.disbursed_at, c.name as customer_name
    FROM loans l
    JOIN customers c ON l.customer_id = c.id
    WHERE LOWER(c.name) LIKE '%siscar%' OR LOWER(c.name) LIKE '%siskar%'
    ORDER BY l.id DESC
  `);
  console.table(siscar.rows);

  // Find Joseph Mutua customer
  console.log('\n=== FINDING JOSEPH MUTUA ===');
  const joseph = await pool.query(`
    SELECT id, name, phone FROM customers
    WHERE LOWER(name) LIKE '%joseph%' OR LOWER(name) LIKE '%mutua%'
  `);
  console.table(joseph.rows);

  // Show all customers if not found
  if (joseph.rows.length === 0) {
    console.log('\n=== ALL CUSTOMERS ===');
    const all = await pool.query('SELECT id, name, phone FROM customers ORDER BY id');
    console.table(all.rows);
  }

  await pool.end();
}

run().catch(e => { console.error(e.message); pool.end(); });
