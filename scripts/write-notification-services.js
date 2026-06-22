const fs = require('fs');

// Email Service
fs.writeFileSync('src/services/emailService.js', `const nodemailer = require('nodemailer');

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
    html: \`
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #16a34a;">Loan Approved!</h2>
        <p>Dear <strong>\${customer.name}</strong>,</p>
        <p>Your loan application has been <strong style="color: #16a34a;">approved</strong>.</p>
        <table style="width:100%; border-collapse: collapse; margin: 20px 0;">
          <tr style="background:#f3f4f6;">
            <td style="padding:8px; border:1px solid #e5e7eb;">Loan ID</td>
            <td style="padding:8px; border:1px solid #e5e7eb;"><strong>#\${loan.id}</strong></td>
          </tr>
          <tr>
            <td style="padding:8px; border:1px solid #e5e7eb;">Amount</td>
            <td style="padding:8px; border:1px solid #e5e7eb;">KSh \${parseFloat(loan.amount).toLocaleString()}</td>
          </tr>
          <tr style="background:#f3f4f6;">
            <td style="padding:8px; border:1px solid #e5e7eb;">Total Repayment</td>
            <td style="padding:8px; border:1px solid #e5e7eb;">KSh \${parseFloat(loan.total_amount || 0).toLocaleString()}</td>
          </tr>
          <tr>
            <td style="padding:8px; border:1px solid #e5e7eb;">Term</td>
            <td style="padding:8px; border:1px solid #e5e7eb;">\${loan.term_weeks} weeks</td>
          </tr>
        </table>
        <p>Your loan will be disbursed shortly.</p>
        <p style="color:#6b7280; font-size:12px;">This is an automated message. Please do not reply.</p>
      </div>
    \`,
  });
};

const sendLoanDisbursedEmail = async (customer, loan) => {
  await sendEmail({
    to: customer.email,
    subject: 'Your Loan Has Been Disbursed',
    html: \`
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Loan Disbursed!</h2>
        <p>Dear <strong>\${customer.name}</strong>,</p>
        <p>Your loan has been <strong style="color: #2563eb;">disbursed</strong> to your account.</p>
        <table style="width:100%; border-collapse: collapse; margin: 20px 0;">
          <tr style="background:#f3f4f6;">
            <td style="padding:8px; border:1px solid #e5e7eb;">Loan ID</td>
            <td style="padding:8px; border:1px solid #e5e7eb;"><strong>#\${loan.id}</strong></td>
          </tr>
          <tr>
            <td style="padding:8px; border:1px solid #e5e7eb;">Amount Disbursed</td>
            <td style="padding:8px; border:1px solid #e5e7eb;">KSh \${parseFloat(loan.amount).toLocaleString()}</td>
          </tr>
          <tr style="background:#f3f4f6;">
            <td style="padding:8px; border:1px solid #e5e7eb;">Total to Repay</td>
            <td style="padding:8px; border:1px solid #e5e7eb;">KSh \${parseFloat(loan.total_amount || 0).toLocaleString()}</td>
          </tr>
        </table>
        <div style="background:#f0fdf4; border:1px solid #86efac; padding:16px; border-radius:8px; margin:20px 0;">
          <h3 style="color:#16a34a; margin:0 0 8px 0;">How to Repay</h3>
          <p style="margin:4px 0;">Paybill Number: <strong>${process.env.KCB_PAYBILL || 'Contact us for Paybill'}</strong></p>
          <p style="margin:4px 0;">Account Number: <strong>#\${loan.id}</strong> (your Loan ID)</p>
          <p style="margin:4px 0; color:#6b7280; font-size:12px;">Use your Loan ID as the account number when paying via KCB Paybill</p>
        </div>
        <p style="color:#6b7280; font-size:12px;">This is an automated message. Please do not reply.</p>
      </div>
    \`,
  });
};

const sendLoanRejectedEmail = async (customer, loan) => {
  await sendEmail({
    to: customer.email,
    subject: 'Loan Application Update',
    html: \`
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Loan Application Update</h2>
        <p>Dear <strong>\${customer.name}</strong>,</p>
        <p>Unfortunately, your loan application <strong>#\${loan.id}</strong> could not be approved at this time.</p>
        \${loan.rejection_reason ? \`<p><strong>Reason:</strong> \${loan.rejection_reason}</p>\` : ''}
        <p>Please contact us for more information or to reapply.</p>
        <p style="color:#6b7280; font-size:12px;">This is an automated message. Please do not reply.</p>
      </div>
    \`,
  });
};

const sendPaymentReceivedEmail = async (customer, payment, loan) => {
  await sendEmail({
    to: customer.email,
    subject: 'Payment Received - Loan #' + loan.id,
    html: \`
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #16a34a;">Payment Received!</h2>
        <p>Dear <strong>\${customer.name}</strong>,</p>
        <p>We have received your payment for Loan <strong>#\${loan.id}</strong>.</p>
        <table style="width:100%; border-collapse: collapse; margin: 20px 0;">
          <tr style="background:#f3f4f6;">
            <td style="padding:8px; border:1px solid #e5e7eb;">Amount Paid</td>
            <td style="padding:8px; border:1px solid #e5e7eb;"><strong>KSh \${parseFloat(payment.amount).toLocaleString()}</strong></td>
          </tr>
          <tr>
            <td style="padding:8px; border:1px solid #e5e7eb;">Transaction Code</td>
            <td style="padding:8px; border:1px solid #e5e7eb;">\${payment.transaction_code || payment.kcb_transaction_id || '-'}</td>
          </tr>
          <tr style="background:#f3f4f6;">
            <td style="padding:8px; border:1px solid #e5e7eb;">Remaining Balance</td>
            <td style="padding:8px; border:1px solid #e5e7eb;">KSh \${parseFloat(loan.balance || 0).toLocaleString()}</td>
          </tr>
        </table>
        \${parseFloat(loan.balance) === 0 ? '<p style="color:#16a34a;"><strong>Congratulations! Your loan is fully paid!</strong></p>' : ''}
        <p style="color:#6b7280; font-size:12px;">This is an automated message. Please do not reply.</p>
      </div>
    \`,
  });
};

module.exports = { sendLoanApprovedEmail, sendLoanDisbursedEmail, sendLoanRejectedEmail, sendPaymentReceivedEmail };
`);

// SMS Service using Africa's Talking
fs.writeFileSync('src/services/smsService.js', `const sendSms = async (phone, message) => {
  try {
    if (!process.env.AT_API_KEY || !process.env.AT_USERNAME) {
      console.warn('[SMSService] Africa\\'s Talking credentials not set — skipping SMS');
      return;
    }

    const AfricasTalking = require('africastalking');
    const at = AfricasTalking({
      apiKey: process.env.AT_API_KEY,
      username: process.env.AT_USERNAME,
    });

    const sms = at.SMS;
    const result = await sms.send({
      to: [phone.startsWith('+') ? phone : '+254' + phone.replace(/^0/, '')],
      message,
      from: process.env.AT_SENDER_ID || undefined,
    });

    console.log('[SMSService] SMS sent:', JSON.stringify(result));
    return result;
  } catch (err) {
    console.error('[SMSService] Failed to send SMS:', err.message);
  }
};

const sendLoanApprovedSms = async (phone, loanId, amount) => {
  await sendSms(phone, \`Your loan of KSh \${parseFloat(amount).toLocaleString()} (ID: #\${loanId}) has been approved. Disbursement is being processed.\`);
};

const sendLoanDisbursedSms = async (phone, loanId, amount, paybill) => {
  await sendSms(phone, \`Loan #\${loanId} of KSh \${parseFloat(amount).toLocaleString()} disbursed. Repay via KCB Paybill \${paybill || ''}, Account: \${loanId}.\`);
};

const sendLoanRejectedSms = async (phone, loanId) => {
  await sendSms(phone, \`Your loan application #\${loanId} was not approved. Please contact us for more information.\`);
};

const sendPaymentReceivedSms = async (phone, amount, loanId, balance) => {
  const msg = parseFloat(balance) === 0
    ? \`Payment of KSh \${parseFloat(amount).toLocaleString()} received for loan #\${loanId}. Loan fully paid! Thank you.\`
    : \`Payment of KSh \${parseFloat(amount).toLocaleString()} received for loan #\${loanId}. Remaining balance: KSh \${parseFloat(balance).toLocaleString()}.\`;
  await sendSms(phone, msg);
};

module.exports = { sendSms, sendLoanApprovedSms, sendLoanDisbursedSms, sendLoanRejectedSms, sendPaymentReceivedSms };
`);

console.log('Email and SMS services created!');
