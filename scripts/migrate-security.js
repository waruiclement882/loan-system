require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Running security migration...\n');

    // ── 1. Add security columns to users table ────────────────────────────────
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP DEFAULT NOW()`);
    console.log('✅ Security columns added to users table');

    // ── 2. Add immutable flag to audit_logs ───────────────────────────────────
    await client.query(`ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS is_immutable BOOLEAN DEFAULT TRUE`);
    await client.query(`ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS checksum TEXT`);
    console.log('✅ Immutable columns added to audit_logs');

    // ── 3. Create immutable audit log trigger (prevents UPDATE/DELETE) ────────
    await client.query(`
      CREATE OR REPLACE FUNCTION prevent_audit_modification()
      RETURNS TRIGGER AS $$
      BEGIN
        RAISE EXCEPTION 'Audit logs are immutable and cannot be modified or deleted';
        RETURN NULL;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Drop existing triggers if any
    await client.query(`DROP TRIGGER IF EXISTS audit_logs_immutable_update ON audit_logs`);
    await client.query(`DROP TRIGGER IF EXISTS audit_logs_immutable_delete ON audit_logs`);

    // Create triggers
    await client.query(`
      CREATE TRIGGER audit_logs_immutable_update
      BEFORE UPDATE ON audit_logs
      FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();
    `);
    await client.query(`
      CREATE TRIGGER audit_logs_immutable_delete
      BEFORE DELETE ON audit_logs
      FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();
    `);
    console.log('✅ Immutable triggers created on audit_logs');

    // ── 4. Verify everything ──────────────────────────────────────────────────
    console.log('\n=== USERS TABLE — NEW SECURITY COLUMNS ===');
    const userCols = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'users'
      AND column_name IN ('failed_login_attempts','locked_until','is_active','last_login','password_changed_at')
    `);
    console.table(userCols.rows);

    console.log('\n=== AUDIT_LOGS — NEW COLUMNS ===');
    const auditCols = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'audit_logs'
      AND column_name IN ('is_immutable','checksum')
    `);
    console.table(auditCols.rows);

    console.log('\n=== IMMUTABLE TRIGGERS ===');
    const triggers = await client.query(`
      SELECT trigger_name, event_manipulation, action_statement
      FROM information_schema.triggers
      WHERE event_object_table = 'audit_logs'
    `);
    console.table(triggers.rows);

    // ── 5. Test immutability ──────────────────────────────────────────────────
    console.log('\n=== TESTING IMMUTABILITY ===');
    try {
      await client.query(`UPDATE audit_logs SET action = 'HACKED' WHERE id = 1`);
      console.log('❌ WARNING: Audit logs can be modified!');
    } catch (e) {
      console.log('✅ Immutability confirmed:', e.message);
    }

    console.log('\n✅ Security migration complete');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
