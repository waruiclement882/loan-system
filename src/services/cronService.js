const cron = require('node-cron');
const pool = require('../db/connection');
const smsService = require('./smsService');
const emailService = require('./emailService');

const sendDailySummary = async () => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Get admin emails
    const admins = await pool.query("SELECT email, name FROM users WHERE role = 'admin' AND email IS NOT NULL");
    if (admins.rows.length === 0) return;

    // Today's collections
    const collections = await pool.query(`
      SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total
      FROM payments WHERE payment_date::date = $1`, [today]);

    // New loans today
    const newLoans = await pool.query(`
      SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total
      FROM loans WHERE created_at::date = $1`, [today]);

    // Pending approvals
    const pending = await pool.query(`
      SELECT COUNT(*) as count FROM loans WHERE status = 'pending'`);

    // Overdue loans
    const overdue = await pool.query(`
      SELECT COUNT(*) as count, COALESCE(SUM(balance), 0) as total
      FROM loans WHERE status = 'active' AND id IN (
        SELECT DISTINCT loan_id FROM repayment_schedules
        WHERE due_date < NOW() AND status = 'pending'
      )`);

    // Active loans summary
    const active = await pool.query(`
      SELECT COUNT(*) as count, COALESCE(SUM(balance), 0) as outstanding
      FROM loans WHERE status = 'active'`);

    // Today's collections detail
    const collectionsDetail = await pool.query(`
      SELECT p.loan_id, c.name as customer_name, p.amount, p.source, p.transaction_code
      FROM payments p
      JOIN loans l ON p.loan_id = l.id
      JOIN customers c ON l.customer_id = c.id
      WHERE p.payment_date::date = $1
      ORDER BY p.payment_date DESC`, [today]);

    const todayFormatted = new Date().toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    const collectionsRows = collectionsDetail.rows.map(p => `
      <tr>
        <td style="padding:8px;border:1px solid #e5e7eb;">Loan #${p.loan_id}</td>
        <td style="padding:8px;border:1px solid #e5e7eb;">${p.customer_name}</td>
        <td style="padding:8px;border:1px solid #e5e7eb;color:#16a34a;font-weight:bold;">KSh ${parseFloat(p.amount).toLocaleString()}</td>
        <td style="padding:8px;border:1px solid #e5e7eb;">${p.source}</td>
        <td style="padding:8px;border:1px solid #e5e7eb;font-family:monospace;">${p.transaction_code || '-'}</td>
      </tr>`).join('');

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:650px;margin:0 auto;background:#f9fafb;padding:20px;">
        <div style="background:#2563eb;color:white;padding:20px;border-radius:8px 8px 0 0;text-align:center;">
          <h1 style="margin:0;font-size:22px;">Daily Summary Report</h1>
          <p style="margin:5px 0 0 0;opacity:0.9;">${todayFormatted}</p>
        </div>
        <div style="background:white;padding:20px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;">

          <!-- Stats Grid -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:24px;">
            <div style="background:#f0fdf4;border:1px solid #86efac;padding:16px;border-radius:8px;text-align:center;">
              <p style="margin:0;color:#6b7280;font-size:13px;">Today's Collections</p>
              <p style="margin:4px 0 0 0;font-size:24px;font-weight:bold;color:#16a34a;">KSh ${parseFloat(collections.rows[0].total).toLocaleString()}</p>
              <p style="margin:2px 0 0 0;color:#6b7280;font-size:12px;">${collections.rows[0].count} payments</p>
            </div>
            <div style="background:#eff6ff;border:1px solid #93c5fd;padding:16px;border-radius:8px;text-align:center;">
              <p style="margin:0;color:#6b7280;font-size:13px;">New Loans Today</p>
              <p style="margin:4px 0 0 0;font-size:24px;font-weight:bold;color:#2563eb;">${newLoans.rows[0].count}</p>
              <p style="margin:2px 0 0 0;color:#6b7280;font-size:12px;">KSh ${parseFloat(newLoans.rows[0].total).toLocaleString()}</p>
            </div>
            <div style="background:#fef2f2;border:1px solid #fca5a5;padding:16px;border-radius:8px;text-align:center;">
              <p style="margin:0;color:#6b7280;font-size:13px;">Overdue Loans</p>
              <p style="margin:4px 0 0 0;font-size:24px;font-weight:bold;color:#dc2626;">${overdue.rows[0].count}</p>
              <p style="margin:2px 0 0 0;color:#6b7280;font-size:12px;">KSh ${parseFloat(overdue.rows[0].total).toLocaleString()} outstanding</p>
            </div>
            <div style="background:#fefce8;border:1px solid #fde047;padding:16px;border-radius:8px;text-align:center;">
              <p style="margin:0;color:#6b7280;font-size:13px;">Pending Approvals</p>
              <p style="margin:4px 0 0 0;font-size:24px;font-weight:bold;color:#ca8a04;">${pending.rows[0].count}</p>
              <p style="margin:2px 0 0 0;color:#6b7280;font-size:12px;">Awaiting review</p>
            </div>
          </div>

          <!-- Portfolio -->
          <div style="background:#f8fafc;padding:16px;border-radius:8px;margin-bottom:24px;">
            <h3 style="margin:0 0 8px 0;color:#374151;">Portfolio Status</h3>
            <p style="margin:4px 0;color:#6b7280;">Active Loans: <strong>${active.rows[0].count}</strong></p>
            <p style="margin:4px 0;color:#6b7280;">Total Outstanding: <strong style="color:#dc2626;">KSh ${parseFloat(active.rows[0].outstanding).toLocaleString()}</strong></p>
          </div>

          <!-- Today's Collections Detail -->
          ${collectionsDetail.rows.length > 0 ? `
          <h3 style="margin:0 0 12px 0;color:#374151;">Today's Payments</h3>
          <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
            <thead>
              <tr style="background:#f3f4f6;">
                <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">Loan</th>
                <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">Customer</th>
                <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">Amount</th>
                <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">Source</th>
                <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">Code</th>
              </tr>
            </thead>
            <tbody>${collectionsRows}</tbody>
          </table>` : '<p style="color:#6b7280;font-style:italic;">No payments recorded today.</p>'}

          <div style="text-align:center;margin-top:20px;">
            <a href="${process.env.FRONTEND_URL || 'https://loan-frontend-xo0d.onrender.com'}/dashboard"
              style="background:#2563eb;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">
              View Dashboard
            </a>
          </div>

          <p style="color:#9ca3af;font-size:11px;text-align:center;margin-top:20px;">
            This is an automated daily summary from Blessed Ventures LTD loan system.
          </p>
        </div>
      </div>`;

    for (const admin of admins.rows) {
      await emailService.sendEmail({
        to: admin.email,
        subject: `Daily Summary - ${todayFormatted} | Blessed Ventures LTD`,
        html
      });
      console.log('[Cron] Daily summary sent to:', admin.email);
    }
  } catch (err) {
    console.error('[Cron] Daily summary failed:', err.message);
  }
};

const sendWeeklySummary = async () => {
  try {
    const admins = await pool.query("SELECT email, name FROM users WHERE role = 'admin' AND email IS NOT NULL");
    if (admins.rows.length === 0) return;

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    const weekStartStr = weekStart.toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];

    // Week's collections
    const collections = await pool.query(`
      SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total
      FROM payments WHERE payment_date::date BETWEEN $1 AND $2`, [weekStartStr, today]);

    // New loans this week
    const newLoans = await pool.query(`
      SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total
      FROM loans WHERE created_at::date BETWEEN $1 AND $2`, [weekStartStr, today]);

    // New customers this week
    const newCustomers = await pool.query(`
      SELECT COUNT(*) as count FROM customers
      WHERE created_at::date BETWEEN $1 AND $2`, [weekStartStr, today]);

    // Portfolio summary
    const portfolio = await pool.query(`
      SELECT
        COUNT(CASE WHEN status='active' THEN 1 END) as active,
        COUNT(CASE WHEN status='paid' THEN 1 END) as paid,
        COUNT(CASE WHEN status='pending' THEN 1 END) as pending,
        COALESCE(SUM(CASE WHEN status='active' THEN balance ELSE 0 END), 0) as outstanding,
        COALESCE(SUM(CASE WHEN status IN ('active','paid') THEN amount ELSE 0 END), 0) as disbursed
      FROM loans`);

    const p = portfolio.rows[0];
    const weekLabel = `${weekStart.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })} - ${new Date().toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}`;

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:650px;margin:0 auto;background:#f9fafb;padding:20px;">
        <div style="background:#7c3aed;color:white;padding:20px;border-radius:8px 8px 0 0;text-align:center;">
          <h1 style="margin:0;font-size:22px;">Weekly Summary Report</h1>
          <p style="margin:5px 0 0 0;opacity:0.9;">${weekLabel}</p>
        </div>
        <div style="background:white;padding:20px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:24px;">
            <div style="background:#f0fdf4;border:1px solid #86efac;padding:16px;border-radius:8px;text-align:center;">
              <p style="margin:0;color:#6b7280;font-size:13px;">Week's Collections</p>
              <p style="margin:4px 0 0 0;font-size:24px;font-weight:bold;color:#16a34a;">KSh ${parseFloat(collections.rows[0].total).toLocaleString()}</p>
              <p style="margin:2px 0 0 0;color:#6b7280;font-size:12px;">${collections.rows[0].count} payments</p>
            </div>
            <div style="background:#eff6ff;border:1px solid #93c5fd;padding:16px;border-radius:8px;text-align:center;">
              <p style="margin:0;color:#6b7280;font-size:13px;">New Loans</p>
              <p style="margin:4px 0 0 0;font-size:24px;font-weight:bold;color:#2563eb;">${newLoans.rows[0].count}</p>
              <p style="margin:2px 0 0 0;color:#6b7280;font-size:12px;">KSh ${parseFloat(newLoans.rows[0].total).toLocaleString()} disbursed</p>
            </div>
            <div style="background:#fdf4ff;border:1px solid #e879f9;padding:16px;border-radius:8px;text-align:center;">
              <p style="margin:0;color:#6b7280;font-size:13px;">New Customers</p>
              <p style="margin:4px 0 0 0;font-size:24px;font-weight:bold;color:#a21caf;">${newCustomers.rows[0].count}</p>
            </div>
            <div style="background:#fef2f2;border:1px solid #fca5a5;padding:16px;border-radius:8px;text-align:center;">
              <p style="margin:0;color:#6b7280;font-size:13px;">Outstanding Balance</p>
              <p style="margin:4px 0 0 0;font-size:24px;font-weight:bold;color:#dc2626;">KSh ${parseFloat(p.outstanding).toLocaleString()}</p>
            </div>
          </div>

          <div style="background:#f8fafc;padding:16px;border-radius:8px;margin-bottom:24px;">
            <h3 style="margin:0 0 12px 0;color:#374151;">Portfolio Overview</h3>
            <table style="width:100%;border-collapse:collapse;">
              <tr><td style="padding:6px;color:#6b7280;">Total Disbursed:</td><td style="padding:6px;font-weight:bold;">KSh ${parseFloat(p.disbursed).toLocaleString()}</td></tr>
              <tr style="background:#f9fafb;"><td style="padding:6px;color:#6b7280;">Active Loans:</td><td style="padding:6px;font-weight:bold;color:#2563eb;">${p.active}</td></tr>
              <tr><td style="padding:6px;color:#6b7280;">Paid Loans:</td><td style="padding:6px;font-weight:bold;color:#16a34a;">${p.paid}</td></tr>
              <tr style="background:#f9fafb;"><td style="padding:6px;color:#6b7280;">Pending Approval:</td><td style="padding:6px;font-weight:bold;color:#ca8a04;">${p.pending}</td></tr>
            </table>
          </div>

          <div style="text-align:center;">
            <a href="${process.env.FRONTEND_URL || 'https://loan-frontend-xo0d.onrender.com'}/reports"
              style="background:#7c3aed;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">
              View Full Reports
            </a>
          </div>
          <p style="color:#9ca3af;font-size:11px;text-align:center;margin-top:20px;">
            Weekly summary from Blessed Ventures LTD loan system.
          </p>
        </div>
      </div>`;

    for (const admin of admins.rows) {
      await emailService.sendEmail({
        to: admin.email,
        subject: `Weekly Summary ${weekLabel} | Blessed Ventures LTD`,
        html
      });
      console.log('[Cron] Weekly summary sent to:', admin.email);
    }
  } catch (err) {
    console.error('[Cron] Weekly summary failed:', err.message);
  }
};

const startCronJobs = () => {
  // Ping self every 14 minutes to prevent sleep
cron.schedule('*/14 * * * *', async () => {
  try {
    const https = require('https');
    https.get('https://loan-system-h794.onrender.com/ping', () => {
      console.log('[Keepalive] Pinged self');
    });
  } catch (err) {
    console.error('[Keepalive] Failed:', err.message);
  }
});
  // Daily summary at 8PM every day
  cron.schedule('0 20 * * *', async () => {
    console.log('[Cron] Sending daily summary...');
    await sendDailySummary();
  });

  // Weekly summary every Monday at 8AM
  cron.schedule('0 8 * * 1', async () => {
    console.log('[Cron] Sending weekly summary...');
    await sendWeeklySummary();
  });

  // Mark overdue installments daily at 8AM
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

  // Payment reminders daily at 8AM
  cron.schedule('0 8 * * *', async () => {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const dueTomorrow = await pool.query(`
        SELECT rs.*, l.customer_id, c.name as customer_name, c.phone
        FROM repayment_schedules rs
        JOIN loans l ON rs.loan_id = l.id
        JOIN customers c ON l.customer_id = c.id
        WHERE rs.due_date::date = $1 AND rs.status = 'pending'`, [tomorrowStr]);

      for (const inst of dueTomorrow.rows) {
        const msg = `Reminder: KSh ${parseFloat(inst.amount_due).toLocaleString()} due tomorrow for Loan #${inst.loan_id}. Pay via KCB Paybill 522522, Account: 8086860.`;
        if (inst.phone) {
          smsService.sendSms(inst.phone, msg).catch(e => console.error('[Cron] SMS error:', e.message));
        }
      }
      console.log('[Cron] Reminders sent. Due tomorrow:', dueTomorrow.rows.length);
    } catch (err) {
      console.error('[Cron] Reminder job failed:', err.message);
    }
  });

  console.log('[Cron] All jobs started — Daily summary at 8PM, Weekly on Monday 8AM');
};

module.exports = { startCronJobs, sendDailySummary, sendWeeklySummary };