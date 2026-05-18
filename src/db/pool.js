const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

pool.connect()
  .then(() => console.log("PostgreSQL connected successfully"))
  .catch((err) => {
    console.error("Database connection error:", err);
    process.exit(1);
  });

module.exports = pool;