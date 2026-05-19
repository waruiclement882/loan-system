const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://microfinance_dqkt_user:ctTkm0GUXhI78h09ruijFiLdzRnE9i3e@dpg-d83m6hegvqtc73c7eia0-a.oregon-postgres.render.com/microfinance_dqkt',
  ssl: { rejectUnauthorized: false }
});

const run = async () => {
  try {
    // Loans and payments columns
    await pool.query(`
      ALTER TABLE loans ADD COLUMN IF NOT EXISTS balance NUMERIC DEFAULT 0;
      ALTER TABLE loans ADD COLUMN IF NOT EXISTS disbursed_at TIMESTAMP;
      UPDATE loans SET balance = COALESCE(total_amount, total_repayment) WHERE balance = 0 OR balance IS NULL;
      ALTER TABLE payments ADD COLUMN IF NOT EXISTS kcb_transaction_id VARCHAR;
      ALTER TABLE payments ADD COLUMN IF NOT EXISTS phone_number VARCHAR;
      ALTER TABLE payments ADD COLUMN IF NOT EXISTS account_number VARCHAR;
    `);
    console.log('Step 1 done: loans and payments columns');

    // New KCB tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS provider_configs (
        id SERIAL PRIMARY KEY,
        provider_name VARCHAR(50) NOT NULL UNIQUE,
        is_active BOOLEAN DEFAULT true,
        config JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS bank_transactions (
        id SERIAL PRIMARY KEY,
        provider VARCHAR(50),
        transaction_reference VARCHAR(100) UNIQUE NOT NULL,
        request_id VARCHAR(100),
        loan_id INTEGER,
        customer_id INTEGER,
        amount NUMERIC(12,2),
        currency VARCHAR(10) DEFAULT 'KES',
        customer_reference VARCHAR(100),
        customer_name VARCHAR(200),
        customer_phone VARCHAR(30),
        channel_code VARCHAR(20),
        narration TEXT,
        organization_short_code VARCHAR(50),
        raw_payload JSONB,
        status VARCHAR(30) DEFAULT 'received',
        processed_at TIMESTAMP,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS webhook_logs (
        id SERIAL PRIMARY KEY,
        provider VARCHAR(50),
        endpoint VARCHAR(200),
        method VARCHAR(10),
        headers JSONB,
        body JSONB,
        signature_valid BOOLEAN,
        response_code INTEGER,
        response_body JSONB,
        processing_time_ms INTEGER,
        ip_address VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS token_cache (
        id SERIAL PRIMARY KEY,
        provider VARCHAR(50) NOT NULL UNIQUE,
        access_token TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_bank_transactions_reference ON bank_transactions(transaction_reference);
      CREATE INDEX IF NOT EXISTS idx_bank_transactions_loan_id ON bank_transactions(loan_id);
      CREATE INDEX IF NOT EXISTS idx_bank_transactions_status ON bank_transactions(status);
      CREATE INDEX IF NOT EXISTS idx_webhook_logs_provider ON webhook_logs(provider);
    `);
    console.log('Step 2 done: KCB tables created');

    console.log('Migration complete!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  }
};

run();