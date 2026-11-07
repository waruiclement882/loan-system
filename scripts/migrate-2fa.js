require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Running 2FA migration...');

    // OTP codes table
    await client.query(`
      CREATE TABLE IF NOT EXISTS otp_codes (
        id            SERIAL PRIMARY KEY,
        user_id       INTEGER REFERENCES users(id) ON DELETE CASCADE,
        code          VARCHAR(6) NOT NULL,
        method        VARCHAR(5) NOT NULL CHECK (method IN ('email','sms')),
        expires_at    TIMESTAMP NOT NULL,
        used          BOOLEAN DEFAULT FALSE,
        created_at    TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ otp_codes table created');

    // Index for fast lookup
    await client.query(`CREATE INDEX IF NOT EXISTS idx_otp_user ON otp_codes(user_id)`);
    console.log('✅ Index created');

    // Add 2fa_enabled column to users
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS two_fa_enabled BOOLEAN DEFAULT TRUE`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_2fa VARCHAR(5) DEFAULT 'email' CHECK (preferred_2fa IN ('email','sms'))`);
    console.log('✅ 2FA columns added to users table');

    // Verify
    const cols = await client.query(`
      SELECT column_name, data_type FROM information_schema.columns
      WHERE table_name = 'users' AND column_name IN ('two_fa_enabled','preferred_2fa')
    `);
    console.log('\n=== USERS 2FA COLUMNS ===');
    console.table(cols.rows);

    const otpCols = await client.query(`
      SELECT column_name, data_type FROM information_schema.columns
      WHERE table_name = 'otp_codes' ORDER BY ordinal_position
    `);
    console.log('\n=== OTP_CODES TABLE ===');
    console.table(otpCols.rows);

    console.log('\n✅ 2FA migration complete');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
