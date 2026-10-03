const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async ({ to, subject, html, text }) => {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.warn('[EmailService] RESEND_API_KEY not set - skipping');
      return;
    }
    const result = await resend.emails.send({
      from: 'Lunar Lumina Solutions <onboarding@resend.dev>',
      to,
      subject,
      html,
      text
    });
    console.log('[EmailService] Email sent to:', to, '| ID:', result.id);
    return result;
  } catch (err) {
    console.error('[EmailService] Failed to send email:', err.message);
  }
};

const sendLoanApprovedEmail = async (customer, loan) => {
  await sendEmail({
    to: customer.email,
    subject: 'Your Loan Has Been Approved - Lunar Lumina Solutions',
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;border:1px solid #e5e7eb;border-radius:8px;">
      <h2 style="color:#16a34a;">Loan Approved! </h2>
      <p>Dear <strong>${customer.name}</strong>,</p>
      <p>Your loan application has been <strong style="color:#16a34a;">approved</strong>.</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0;">
        <tr style="background:#f3f4f6;"><td style="padding:8px;border:1px solid #e5e7eb;">Loan ID</td><td style="padding:8px;border:1px solid #e5e7eb;"><strong>#${loan.id}</strong></td></tr>
        <tr><td style="padding:8px;border:1px solid #e5e7eb;">Amount</td><td style="padding:8px;border:1px solid #e5e7eb;">KSh ${parseFloat(loan.amount).toLocaleString()}</td></tr>
        <tr style="background:#f3f4f6;"><td style="padding:8px;border:1px solid #e5e7eb;">Total Repayment</td><td style="padding:8px;border:1px solid #e5e7eb;">KSh ${parseFloat(loan.total_amount || 0).toLocaleString()}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e5e7eb;">Term</td><td style="padding:8px;border:1px solid #e5e7eb;">${loan.term_weeks} weeks</td></tr>
      </table>
      <p>Pay processing fee via <strong>KCB Paybill 522522</strong>, Account: <strong>8086860</strong></p>
      <p style="color:#6b7280;font-size:12px;">Lunar Lumina Solutions | Rongai, Nairobi | 0732 378 663</p>
    </div>`
  });
};

const sendLoanDisbursedEmail = async (customer, loan) => {
  await sendEmail({
    to: customer.email,
    subject: 'Your Loan Has Been Disbursed - Lunar Lumina Solutions',
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;border:1px solid #e5e7eb;border-radius:8px;">
      <h2 style="color:#2563eb;">Loan Disbursed!</h2>
      <p>Dear <strong>${customer.name}</strong>,</p>
      <p>Your loan has been <strong style="color:#2563eb;">disbursed</strong>.</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0;">
        <tr style="background:#f3f4f6;"><td style="padding:8px;border:1px solid #e5e7eb;">Loan ID</td><td style="padding:8px;border:1px solid #e5e7eb;"><strong>#${loan.id}</strong></td></tr>
        <tr><td style="padding:8px;border:1px solid #e5e7eb;">Amount Disbursed</td><td style="padding:8px;border:1px solid #e5e7eb;">KSh ${parseFloat(loan.amount).toLocaleString()}</td></tr>
        <tr style="background:#f3f4f6;"><td style="padding:8px;border:1px solid #e5e7eb;">Total to Repay</td><td style="padding:8px;border:1px solid #e5e7eb;">KSh ${parseFloat(loan.total_amount || 0).toLocaleString()}</td></tr>
      </table>
      <p>Repay via <strong>KCB Paybill 522522</strong>, Account: <strong>8086860</strong></p>
      <p style="color:#6b7280;font-size:12px;">Lunar Lumina Solutions | Rongai, Nairobi | 0732 378 663</p>
    </div>`
  });
};

const sendLoanRejectedEmail = async (customer, loan) => {
  await sendEmail({
    to: customer.email,
    subject: 'Loan Application Update - Lunar Lumina Solutions',
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;border:1px solid #e5e7eb;border-radius:8px;">
      <h2 style="color:#dc2626;">Loan Application Update</h2>
      <p>Dear <strong>${customer.name}</strong>,</p>
      <p>Unfortunately, your loan application <strong>#${loan.id}</strong> could not be approved at this time.</p>
      ${loan.rejection_reason ? `<p><strong>Reason:</strong> ${loan.rejection_reason}</p>` : ''}
      <p>Please contact us for more information.</p>
      <p style="color:#6b7280;font-size:12px;">Lunar Lumina Solutions | 0732 378 663 | 0768 750 371</p>
    </div>`
  });
};

const sendPaymentReceivedEmail = async (customer, payment, loan) => {
  await sendEmail({
    to: customer.email,
    subject: `Payment Received - Loan #${loan.id} - Lunar Lumina Solutions`,
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;border:1px solid #e5e7eb;border-radius:8px;">
      <h2 style="color:#16a34a;">Payment Received!</h2>
      <p>Dear <strong>${customer.name}</strong>,</p>
      <p>We have received your payment for Loan <strong>#${loan.id}</strong>.</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0;">
        <tr style="background:#f3f4f6;"><td style="padding:8px;border:1px solid #e5e7eb;">Amount Paid</td><td style="padding:8px;border:1px solid #e5e7eb;"><strong>KSh ${parseFloat(payment.amount).toLocaleString()}</strong></td></tr>
        <tr><td style="padding:8px;border:1px solid #e5e7eb;">Transaction Code</td><td style="padding:8px;border:1px solid #e5e7eb;">${payment.transaction_code || '-'}</td></tr>
        <tr style="background:#f3f4f6;"><td style="padding:8px;border:1px solid #e5e7eb;">Remaining Balance</td><td style="padding:8px;border:1px solid #e5e7eb;">KSh ${parseFloat(loan.balance || 0).toLocaleString()}</td></tr>
      </table>
      ${parseFloat(loan.balance) === 0 ? '<p style="color:#16a34a;"><strong>Congratulations! Your loan is fully paid!</strong></p>' : ''}
      <p style="color:#6b7280;font-size:12px;">Lunar Lumina Solutions | Rongai, Nairobi | 0732 378 663</p>
    </div>`
  });
};

module.exports = { sendEmail, sendLoanApprovedEmail, sendLoanDisbursedEmail, sendLoanRejectedEmail, sendPaymentReceivedEmail };