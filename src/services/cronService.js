const cron = require('node-cron');
const pool = require('../db/connection');
const smsService = require('./smsService');
const emailService = require('./emailService');

// Run every day at 8am
const startCronJobs = () => {

  // 1. Mark overdue installments daily at 8am
  cron.schedule('0 8 * * *', async () => {
    try {
      const result = await pool.query(
        "UPDATE repayment_schedules SET status='overdue' WHERE due_date < NOW() AND status='pending' RETURNING loan_id"
      );
      if (result.rows.length > 0) {
        console.log('[Cron] Marked', result.rows.length, 'installments as overdue');
      }
    } catch (err) {
      console.error('[Cron] Overdue update failed:', err.message);
    }
  });

  // 2. Send payment reminders daily at 8am
  cron.schedule('0 8 * * *', async () => {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      // Get installments due tomorrow
      const dueTomorrow = await pool.query(
        `SELECT rs.*, l.customer_id, c.name as customer_name, c.phone, c.email
         FROM repayment_schedules rs
         JOIN loans l ON rs.loan_id = l.loan_id
         JOIN customers c ON l.customer_id = c.id
         WHERE rs.due_date::date = $1 AND rs.status = 'pending'`,
        [tomorrowStr]
      );

      for (const inst of dueTomorrow.rows) {
        const msg = `Reminder: KSh ${parseFloat(inst.amount_due).toLocaleString()} due tomorrow for Loan #${inst.loan_id}. Pay via KCB Paybill, Account: ${inst.loan_id}.`;
        if (inst.phone) {
          smsService.sendSms(inst.phone, msg).catch(e => console.error('[Cron] SMS error:', e.message));
        }
        console.log('[Cron] Reminder sent to:', inst.customer_name, 'for loan:', inst.loan_id);
      }

      // Get overdue installments — send overdue alerts
      const overdue = await pool.query(
        `SELECT rs.*, l.customer_id, c.name as customer_name, c.phone, c.email
         FROM repayment_schedules rs
         JOIN loans l ON rs.loan_id = l.id
         JOIN customers c ON l.customer_id = c.id
         WHERE rs.status = 'overdue'`
      );

      for (const inst of overdue.rows) {
        const daysOverdue = Math.floor((new Date() - new Date(inst.due_date)) / (1000 * 60 * 60 * 24));
        const msg = `OVERDUE: Loan #${inst.loan_id} installment of KSh ${parseFloat(inst.amount_due).toLocaleString()} is ${daysOverdue} day(s) overdue. Pay now via KCB Paybill, Account: ${inst.loan_id}.`;
        if (inst.phone) {
          smsService.sendSms(inst.phone, msg).catch(e => console.error('[Cron] SMS error:', e.message));
        }
      }

      console.log('[Cron] Reminders complete. Due tomorrow:', dueTomorrow.rows.length, 'Overdue:', overdue.rows.length);
    } catch (err) {
      console.error('[Cron] Reminder job failed:', err.message);
    }
  });

  console.log('[Cron] Jobs started — running daily at 8am');
};

module.exports = { startCronJobs };
