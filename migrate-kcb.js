const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://microfinance_dqkt_user:ctTkm0GUXhI78h09ruijFiLdzRnE9i3e@dpg-d83m6hegvqtc73c7eia0-a.oregon-postgres.render.com/microfinance_dqkt',
  ssl: { rejectUnauthorized: false }
});

pool.query(`
  ALTER TABLE loans ADD COLUMN IF NOT EXISTS balance NUMERIC DEFAULT 0;
  ALTER TABLE loans ADD COLUMN IF NOT EXISTS disbursed_at TIMESTAMP;
  UPDATE loans SET balance = COALESCE(total_amount, total_repayment) WHERE balance = 0 OR balance IS NULL;
  ALTER TABLE payments ADD COLUMN IF NOT EXISTS kcb_transaction_id VARCHAR;
  ALTER TABLE payments ADD COLUMN IF NOT EXISTS phone_number VARCHAR;
  ALTER TABLE payments ADD COLUMN IF NOT EXISTS account_number VARCHAR;
`)
.then(() => { console.log('Done!'); process.exit(); })
.catch(e => { console.error(e.message); process.exit(); });