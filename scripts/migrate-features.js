const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://microfinance_dqkt_user:ctTkm0GUXhI78h09ruijFiLdzRnE9i3e@dpg-d83m6hegvqtc73c7eia0-a.oregon-postgres.render.com/microfinance_dqkt',
  ssl: { rejectUnauthorized: false }
});

const run = async () => {
  try {
    await pool.query(`
      -- Audit logs table
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        action VARCHAR(100) NOT NULL,
        entity VARCHAR(100),
        entity_id INTEGER,
        details JSONB,
        ip_address VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

      -- Password reset columns
      ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(200);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP;

      -- Processing fee column on pricing rules
      ALTER TABLE loan_pricing_rules ADD COLUMN IF NOT EXISTS processing_fee NUMERIC DEFAULT 0;

      -- Processing fee columns on loans
      ALTER TABLE loans ADD COLUMN IF NOT EXISTS processing_fee NUMERIC DEFAULT 0;
      ALTER TABLE loans ADD COLUMN IF NOT EXISTS processing_fee_paid BOOLEAN DEFAULT false;
      ALTER TABLE loans ADD COLUMN IF NOT EXISTS processing_fee_paid_at TIMESTAMP;
      ALTER TABLE loans ADD COLUMN IF NOT EXISTS processing_fee_transaction VARCHAR(100);
    `);
    console.log('Migration complete!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  }
};

run();
