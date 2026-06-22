require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check if Faith Kagendo exists
    console.log('\n=== CHECKING FAITH KAGENDO ===');
    let customerRes = await client.query(
      "SELECT id, name, phone FROM customers WHERE LOWER(name) LIKE '%faith%' OR LOWER(name) LIKE '%kagendo%'"
    );
    console.table(customerRes.rows);

    let customerId;
    if (customerRes.rows.length > 0) {
      customerId = customerRes.rows[0].id;
      console.log(`✅ Found existing customer ID #${customerId}`);
    } else {
      // Create customer
      const newCustomer = await client.query(
        "INSERT INTO customers (name, phone) VALUES ('Faith Kagendo', '0700000000') RETURNING *"
      );
      customerId = newCustomer.rows[0].id;
      console.log(`✅ Created new customer ID #${customerId} — update phone number manually`);
    }

    // Loan details
    const principal    = 10000;
    const interest     = 2000;
    const total        = 12000;
    const termWeeks    = 1;
    const weekly       = 12000;
    const disbursedAt  = new Date('2026-05-15T08:00:00.000Z');
    const repaidAt     = new Date('2026-05-22T08:00:00.000Z');

    // Insert loan
    const loanRes = await client.query(`
      INSERT INTO loans (
        customer_id, amount, term_weeks, interest_amount, total_amount,
        weekly_installment, balance, status,
        processing_fee, processing_fee_paid,
        disbursed_at, created_at, closed_at, total_repayment
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      RETURNING *`,
      [
        customerId, principal, termWeeks, interest, total,
        weekly, 0, 'paid',
        800, false,          // processing fee NOT paid
        disbursedAt, disbursedAt, repaidAt, total
      ]
    );
    const loan = loanRes.rows[0];
    console.log(`\n✅ Faith Kagendo loan created — ID #${loan.id}`);

    // Insert 1-week schedule — paid
    await client.query(`
      INSERT INTO repayment_schedules
        (loan_id, installment_no, due_date, amount_due, amount_paid, balance, status, paid_at)
      VALUES ($1, 1, $2, $3, $3, 0, 'paid', $4)`,
      [loan.id, repaidAt.toISOString().split('T')[0], total, repaidAt]
    );
    console.log('✅ Repayment schedule created — 1 week paid');

    // Insert payment
    await client.query(`
      INSERT INTO payments (loan_id, amount, transaction_code, source, notes, payment_date)
      VALUES ($1, $2, 'FAITH-KAGENDO-WEEK-1', 'kcb_paybill', 'Full repayment in 1 week', $3)`,
      [loan.id, total, repaidAt]
    );
    console.log('✅ Payment of KSh 12,000 recorded via KCB Paybill');

    await client.query('COMMIT');

    // Verify
    console.log('\n=== VERIFICATION ===');
    const verify = await pool.query(`
      SELECT l.id, c.name, l.amount, l.total_amount, l.balance,
             l.status, l.processing_fee_paid, l.disbursed_at, l.closed_at
      FROM loans l JOIN customers c ON l.customer_id = c.id
      WHERE l.id = $1`, [loan.id]
    );
    console.table(verify.rows);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
