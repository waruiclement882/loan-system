const fs = require('fs');

let content = fs.readFileSync('src/repositories/loanRepository.js', 'utf8');

// Replace the disburse function
const oldDisburse = `const disburse = async (id, disbursed_by) => {
  const r = await pool.query(
    'UPDATE loans SET status=$1, disbursed_by=$2, disbursed_at=NOW(), balance=total_amount WHERE id=$3 AND status=$4 RETURNING *',
    ['active', disbursed_by, id, 'approved']
  );
  return r.rows[0];
};`;

const newDisburse = `const disburse = async (id, disbursed_by) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const r = await client.query(
      'UPDATE loans SET status=$1, disbursed_by=$2, disbursed_at=NOW(), balance=total_amount WHERE id=$3 AND status=$4 RETURNING *',
      ['active', disbursed_by, id, 'approved']
    );

    if (!r.rows[0]) {
      await client.query('ROLLBACK');
      return null;
    }

    const loan = r.rows[0];

    // Auto-generate repayment schedule
    if (loan.term_weeks && loan.total_amount) {
      await client.query('DELETE FROM repayment_schedules WHERE loan_id=$1', [loan.id]);

      const totalAmount = parseFloat(loan.total_amount);
      const termWeeks = parseInt(loan.term_weeks);
      const weeklyAmount = Math.ceil(totalAmount / termWeeks);
      let runningBalance = totalAmount;
      const start = new Date(loan.disbursed_at || new Date());

      for (let i = 1; i <= termWeeks; i++) {
        const due = new Date(start);
        due.setDate(due.getDate() + (i * 7));
        const amt = i === termWeeks ? parseFloat(runningBalance.toFixed(2)) : weeklyAmount;
        runningBalance = parseFloat((runningBalance - amt).toFixed(2));
        if (runningBalance < 0) runningBalance = 0;

        await client.query(
          \`INSERT INTO repayment_schedules (loan_id, installment_no, due_date, amount_due, amount_paid, balance, status)
           VALUES ($1, $2, $3, $4, 0, $5, 'pending')\`,
          [loan.id, i, due.toISOString().split('T')[0], amt, runningBalance]
        );
      }
      console.log(\`[Repo] Generated \${termWeeks}-week schedule for loan #\${loan.id}\`);
    }

    await client.query('COMMIT');
    return loan;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};`;

// Try exact match first
if (content.includes("const disburse = async (id, disbursed_by) => {")) {
  // Find and replace the entire disburse function
  const start = content.indexOf("const disburse = async (id, disbursed_by) => {");
  const end = content.indexOf("};", start) + 2;
  content = content.substring(0, start) + newDisburse + content.substring(end);
  console.log('Disburse function replaced!');
} else {
  console.log('Could not find disburse function - check manually');
}

fs.writeFileSync('src/repositories/loanRepository.js', content, 'utf8');

// Verify
const updated = fs.readFileSync('src/repositories/loanRepository.js', 'utf8');
console.log('Has generateSchedule in disburse:', updated.includes('repayment_schedules WHERE loan_id'));
