const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendEmail = async ({ to, subject, html }) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.warn('[EmailService] Email credentials not set — skipping email');
      return;
    }
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject,
      html,
    });
    console.log('[EmailService] Email sent to:', to);
  } catch (err) {
    console.error('[EmailService] Failed to send email:', err.message);
  }
};

const sendLoanApprovedEmail = async (customer, loan) => {
  await sendEmail({
    to: customer.email,
    subject: 'Your Loan Has Been Approved',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #16a34a;">Loan Approved!</h2>
        <p>Dear <strong>${customer.name}</strong>,</p>
        <p>Your loan application has been <strong style="color: #16a34a;">approved</strong>.</p>
        <table style="width:100%; border-collapse: collapse; margin: 20px 0;">
          <tr style="background:#f3f4f6;">
            <td style="padding:8px; border:1px solid #e5e7eb;">Loan ID</td>
            <td style="padding:8px; border:1px solid #e5e7eb;"><strong>#${loan.id}</strong></td>
          </tr>
          <tr>
            <td style="padding:8px; border:1px solid #e5e7eb;">Amount</td>
            <td style="padding:8px; border:1px solid #e5e7eb;">KSh ${parseFloat(loan.amount).toLocaleString()}</td>
          </tr>
          <tr style="background:#f3f4f6;">
            <td style="padding:8px; border:1px solid #e5e7eb;">Total Repayment</td>
            <td style="padding:8px; border:1px solid #e5e7eb;">KSh ${parseFloat(loan.total_amount || 0).toLocaleString()}</td>
          </tr>
          <tr>
            <td style="padding:8px; border:1px solid #e5e7eb;">Term</td>
            <td style="padding:8px; border:1px solid #e5e7eb;">${loan.term_weeks} weeks</td>
          </tr>
        </table>
        <p>Your loan will be disbursed shortly.</p>
        <p style="color:#6b7280; font-size:12px;">This is an automated message. Please do not reply.</p>
      </div>
    `,
  });
};

const sendLoanDisbursedEmail = async (customer, loan) => {
  await sendEmail({
    to: customer.email,
    subject: 'Your Loan Has Been Disbursed',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Loan Disbursed!</h2>
        <p>Dear <strong>${customer.name}</strong>,</p>
        <p>Your loan has been <strong style="color: #2563eb;">disbursed</strong> to your account.</p>
        <table style="width:100%; border-collapse: collapse; margin: 20px 0;">
          <tr style="background:#f3f4f6;">
            <td style="padding:8px; border:1px solid #e5e7eb;">Loan ID</td>
            <td style="padding:8px; border:1px solid #e5e7eb;"><strong>#${loan.id}</strong></td>
          </tr>
          <tr>
            <td style="padding:8px; border:1px solid #e5e7eb;">Amount Disbursed</td>
            <td style="padding:8px; border:1px solid #e5e7eb;">KSh ${parseFloat(loan.amount).toLocaleString()}</td>
          </tr>
          <tr style="background:#f3f4f6;">
            <td style="padding:8px; border:1px solid #e5e7eb;">Total to Repay</td>
            <td style="padding:8px; border:1px solid #e5e7eb;">KSh ${parseFloat(loan.total_amount || 0).toLocaleString()}</td>
          </tr>
        </table>
        <div style="background:#f0fdf4; border:1px solid #86efac; padding:16px; border-radius:8px; margin:20px 0;">
          <h3 style="color:#16a34a; margin:0 0 8px 0;">How to Repay</h3>
          <p style="margin:4px 0;">Paybill Number: <strong>Contact us for Paybill</strong></p>
          <p style="margin:4px 0;">Account Number: <strong>#${loan.id}</strong> (your Loan ID)</p>
          <p style="margin:4px 0; color:#6b7280; font-size:12px;">Use your Loan ID as the account number when paying via KCB Paybill</p>
        </div>
        <p style="color:#6b7280; font-size:12px;">This is an automated message. Please do not reply.</p>
      </div>
    `,
  });
};

const sendLoanRejectedEmail = async (customer, loan) => {
  await sendEmail({
    to: customer.email,
    subject: 'Loan Application Update',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Loan Application Update</h2>
        <p>Dear <strong>${customer.name}</strong>,</p>
        <p>Unfortunately, your loan application <strong>#${loan.id}</strong> could not be approved at this time.</p>
        ${loan.rejection_reason ? `<p><strong>Reason:</strong> ${loan.rejection_reason}</p>` : ''}
        <p>Please contact us for more information or to reapply.</p>
        <p style="color:#6b7280; font-size:12px;">This is an automated message. Please do not reply.</p>
      </div>
    `,
  });
};

const sendPaymentReceivedEmail = async (customer, payment, loan) => {
  await sendEmail({
    to: customer.email,
    subject: 'Payment Received - Loan #' + loan.id,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #16a34a;">Payment Received!</h2>
        <p>Dear <strong>${customer.name}</strong>,</p>
        <p>We have received your payment for Loan <strong>#${loan.id}</strong>.</p>
        <table style="width:100%; border-collapse: collapse; margin: 20px 0;">
          <tr style="background:#f3f4f6;">
            <td style="padding:8px; border:1px solid #e5e7eb;">Amount Paid</td>
            <td style="padding:8px; border:1px solid #e5e7eb;"><strong>KSh ${parseFloat(payment.amount).toLocaleString()}</strong></td>
          </tr>
          <tr>
            <td style="padding:8px; border:1px solid #e5e7eb;">Transaction Code</td>
            <td style="padding:8px; border:1px solid #e5e7eb;">${payment.transaction_code || payment.kcb_transaction_id || '-'}</td>
          </tr>
          <tr style="background:#f3f4f6;">
            <td style="padding:8px; border:1px solid #e5e7eb;">Remaining Balance</td>
            <td style="padding:8px; border:1px solid #e5e7eb;">KSh ${parseFloat(loan.balance || 0).toLocaleString()}</td>
          </tr>
        </table>
        ${parseFloat(loan.balance) === 0 ? '<p style="color:#16a34a;"><strong>Congratulations! Your loan is fully paid!</strong></p>' : ''}
        <p style="color:#6b7280; font-size:12px;">This is an automated message. Please do not reply.</p>
      </div>
    `,
  });
};

module.exports = { sendEmail, sendLoanApprovedEmail, sendLoanDisbursedEmail, sendLoanRejectedEmail, sendPaymentReceivedEmail };
