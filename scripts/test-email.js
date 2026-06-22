require('dotenv').config(); const { sendLoanApprovedEmail } = require('./src/services/emailService'); sendLoanApprovedEmail({ name: 'Test User', email: 'waruiclement882@gmail.com' }, { id: 1, amount: 5000, total_amount: 7650, term_weeks: 6 }).then(() => { console.log('Email sent!'); process.exit(); }).catch(e => { console.error('Failed:', e.message); process.exit(); });
require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

transporter.sendMail({
  from: process.env.EMAIL_USER,
  to: process.env.EMAIL_USER,
  subject: 'Test Email from Blessed Ventures LTD',
  html: '<h2>Test email working!</h2><p>Your email configuration is correct.</p>'
}).then(() => {
  console.log('✅ Email sent successfully! Check your inbox.');
  process.exit();
}).catch(err => {
  console.error('❌ Email failed:', err.message);
  process.exit();
});