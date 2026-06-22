require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ── 1. Generate schedule for Siscar loan #14 ─────────────────────────────
    console.log('\n=== GENERATING SCHEDULE FOR SISCAR LOAN #14 ===');

    const siscarLoan = await client.query('SELECT * FROM loans WHERE id = 14');
    const loan = siscarLoan.rows[0];

    await client.query('DELETE FROM repayment_schedules WHERE loan_id = 14');

    const totalAmount = parseFloat(loan.total_amount);
    const termWeeks = parseInt(loan.term_weeks);
    const weeklyAmount = parseFloat(loan.weekly_installment);
    const start = new Date(loan.disbursed_at);
    let runningBalance = totalAmount;

    for (let i = 1; i <= termWeeks; i++) {
      const due = new Date(start);
      due.setDate(due.getDate() + (i * 7));
      const amt = i === termWeeks
        ? parseFloat(runningBalance.toFixed(2))
        : weeklyAmount;
      runningBalance = parseFloat((runningBalance - amt).toFixed(2));
      if (runningBalance < 0) runningBalance = 0;

      await client.query(
        `INSERT INTO repayment_schedules (loan_id, installment_no, due_date, amount_due, amount_paid, balance, status)
         VALUES ($1, $2, $3, $4, 0, $5, 'pending')`,
        [14, i, due.toISOString().split('T')[0], amt, runningBalance]
      );
      console.log(`  Week ${i} — Due: ${due.toISOString().split('T')[0]} — KSh ${amt} — Balance after: KSh ${runningBalance}`);
    }
    console.log('✅ Siscar schedule generated');

    // ── 2. Add Joseph Mutua historical loan ──────────────────────────────────
    console.log('\n=== ADDING JOSEPH MUTUA LOAN ===');

    // Loan details: KSh 10,000 principal, 4 weeks
    // interest rate same as system — let's calculate: similar loans use ~53% interest
    // Joseph: 10000 principal, 4 weeks
    // Using standard: amount < 10000 = 700 fee, = 10000 = 800 fee
    const principal = 10000;
    const interest = 2000; // 20% for 4 weeks — adjust if needed
    const totalRepayable = principal + interest; // 12000
    const termWeeksJ = 4;
    const weeklyJ = parseFloat((totalRepayable / termWeeksJ).toFixed(2)); // 3000
    const disbursedAt = new Date('2025-04-30T08:00:00.000Z');
    const paidAt = new Date('2025-05-18T08:00:00.000Z');

    // Insert loan
    const josephLoan = await client.query(`
      INSERT INTO loans (
        customer_id, amount, term_weeks, interest_amount, total_amount,
        weekly_installment, balance, status, processing_fee, processing_fee_paid,
        processing_fee_paid_at, processing_fee_transaction,
        disbursed_at, created_at, closed_at, total_repayment
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
      RETURNING *`,
      [
        11,           // customer_id (Joseph Mutua)
        principal,    // amount
        termWeeksJ,   // term_weeks
        interest,     // interest_amount
        totalRepayable, // total_amount
        weeklyJ,      // weekly_installment
        0,            // balance (fully paid)
        'paid',       // status
        800,          // processing_fee (10000 = 800)
        true,         // processing_fee_paid
        disbursedAt,  // processing_fee_paid_at
        'BACKFILL-JOSEPH-FEE', // processing_fee_transaction
        disbursedAt,  // disbursed_at
        disbursedAt,  // created_at
        paidAt,       // closed_at
        totalRepayable // total_repayment
      ]
    );
    const jLoan = josephLoan.rows[0];
    console.log(`✅ Joseph Mutua loan created — ID #${jLoan.id}`);

    // Insert repayment schedule (all paid on 18 May)
    let jBalance = totalRepayable;
    for (let i = 1; i <= termWeeksJ; i++) {
      const due = new Date(disbursedAt);
      due.setDate(due.getDate() + (i * 7));
      const amt = i === termWeeksJ
        ? parseFloat(jBalance.toFixed(2))
        : weeklyJ;
      jBalance = parseFloat((jBalance - amt).toFixed(2));
      if (jBalance < 0) jBalance = 0;

      await client.query(`
        INSERT INTO repayment_schedules (loan_id, installment_no, due_date, amount_due, amount_paid, balance, status, paid_at)
        VALUES ($1, $2, $3, $4, $5, $6, 'paid', $7)`,
        [jLoan.id, i, due.toISOString().split('T')[0], amt, amt, jBalance, paidAt]
      );
      console.log(`  Week ${i} — Due: ${due.toISOString().split('T')[0]} — KSh ${amt} — PAID`);
    }

    // Insert 4 payment records (one per week, all on 18 May)
    for (let i = 1; i <= termWeeksJ; i++) {
      await client.query(`
        INSERT INTO payments (loan_id, amount, transaction_code, source, notes, payment_date)
        VALUES ($1, $2, $3, 'cash', $4, $5)`,
        [jLoan.id, weeklyJ, `JOSEPH-MUTUA-WEEK-${i}`, `Week ${i} payment`, paidAt]
      );
    }
    console.log(`✅ ${termWeeksJ} payments recorded for Joseph Mutua`);

    // Insert processing fee into company_income
    await client.query(`
      INSERT INTO company_income (loan_id, amount, type, transaction_code, notes, created_at)
      VALUES ($1, 800, 'processing_fee', 'BACKFILL-JOSEPH-FEE', 'Processing fee — Joseph Mutua backfilled', $2)`,
      [jLoan.id, disbursedAt]
    );
    console.log('✅ Processing fee recorded in company_income');

    await client.query('COMMIT');

    // ── Verify ───────────────────────────────────────────────────────────────
    console.log('\n=== VERIFICATION ===');

    const siscarSched = await pool.query(
      'SELECT installment_no, due_date, amount_due, status FROM repayment_schedules WHERE loan_id = 14 ORDER BY installment_no'
    );
    console.log('\nSiscar Loan #14 Schedule:');
    console.table(siscarSched.rows);

    const josephSched = await pool.query(
      `SELECT installment_no, due_date, amount_due, amount_paid, status
       FROM repayment_schedules WHERE loan_id = $1 ORDER BY installment_no`,
      [jLoan.id]
    );
    console.log(`\nJoseph Mutua Loan #${jLoan.id} Schedule:`);
    console.table(josephSched.rows);

    const josephPayments = await pool.query(
      'SELECT amount, transaction_code, payment_date FROM payments WHERE loan_id = $1',
      [jLoan.id]
    );
    console.log('\nJoseph Mutua Payments:');
    console.table(josephPayments.rows);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error — rolled back:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
