require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

// Tables the AI must never see at all.
const DENY_TABLE = /(token|otp|session|secret|credential|webhook)/i;

// Columns that are never exposed to the AI.
const EXCLUDE_COL = /(password|passwd|token|secret|_public_id|_url$|raw_payload|^headers$|^body$|^raw$)/i;

const maskLast3 = (q) => `CASE WHEN ${q} IS NULL THEN NULL ELSE '***' || RIGHT(${q}::text, 3) END`;

// Returns the SELECT expression for a column, or null to hide it.
const colExpr = (table, col) => {
  if (EXCLUDE_COL.test(col)) return null;
  const q = `"${col}"`;
  if (/^(national_id|id_number)$/i.test(col)) return `${maskLast3(q)} AS ${q}`;
  if (/(^|_)phone(_number)?$|^mobile$/i.test(col)) return `${maskLast3(q)} AS ${q}`;
  if (/(^|_)email$/i.test(col)) {
    return `CASE WHEN ${q} IS NULL THEN NULL ELSE LEFT(${q}::text, 2) || '***@' || SPLIT_PART(${q}::text, '@', 2) END AS ${q}`;
  }
  if (table === 'audit_logs' && col === 'details') {
    return `LEFT(REGEXP_REPLACE(${q}::text, '("(password|token|secret|code|otp)"\\s*:\\s*)"[^"]*"', '\\1"[hidden]"', 'gi'), 500) AS ${q}`;
  }
  return q;
};

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Running AI assistant + premises photo migration...\n');

    // 1. Premises photo columns
    await client.query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS premises_photo_url TEXT`);
    await client.query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS premises_photo_public_id TEXT`);
    await client.query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS premises_photo_updated_at TIMESTAMP`);
    await client.query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS premises_photo_updated_by VARCHAR(100)`);
    console.log('✅ Premises photo columns added to customers');

    // 2. error_logs table (filled by the errorCapture middleware)
    await client.query(`
      CREATE TABLE IF NOT EXISTS error_logs (
        id           SERIAL PRIMARY KEY,
        method       VARCHAR(10),
        path         TEXT,
        status_code  INTEGER,
        message      TEXT,
        user_id      INTEGER,
        created_at   TIMESTAMP DEFAULT NOW()
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_error_logs_created ON error_logs(created_at)`);
    console.log('✅ error_logs table ready');

    // 3. Read-only, masked views for the AI assistant
    await client.query(`CREATE SCHEMA IF NOT EXISTS ai_readonly`);

    const tablesRes = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    const exposed = [];
    const hidden = [];

    for (const { table_name: t } of tablesRes.rows) {
      if (DENY_TABLE.test(t)) { hidden.push(t); continue; }

      const cols = (await client.query(
        `SELECT column_name FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position`,
        [t]
      )).rows;

      const exprs = cols.map(c => colExpr(t, c.column_name)).filter(Boolean);
      if (!exprs.length) { hidden.push(t); continue; }

      await client.query(`DROP VIEW IF EXISTS ai_readonly."${t}"`);
      await client.query(`CREATE VIEW ai_readonly."${t}" AS SELECT ${exprs.join(', ')} FROM public."${t}"`);
      exposed.push(t);
    }

    console.log(`\n✅ ${exposed.length} views created in ai_readonly:`);
    console.log('   ' + exposed.join(', '));
    console.log(`\n🔒 Not exposed to the AI: ${hidden.join(', ') || '(none)'}`);

    // 4. Verify masking
    const usersCols = await client.query(
      `SELECT column_name FROM information_schema.columns WHERE table_schema='ai_readonly' AND table_name='users'`
    );
    const names = usersCols.rows.map(r => r.column_name);
    console.log('\n=== ai_readonly.users columns ===');
    console.log(names.join(', '));
    console.log(names.includes('password') ? '❌ password column is exposed!' : '✅ password hidden');

    const sample = await client.query(`SELECT id, name, phone, national_id FROM ai_readonly.customers LIMIT 3`);
    console.log('\n=== Masking check (ai_readonly.customers) ===');
    console.table(sample.rows);

    console.log('\n✅ Migration complete. Re-run this script whenever you add new tables or columns.');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
