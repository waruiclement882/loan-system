const axios = require('axios');

const WHATSAPP_API_URL = 'https://graph.facebook.com/v25.0';
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

const sendWhatsApp = async (phone, message) => {
  try {
    if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
      console.warn('[WhatsApp] Credentials not set - skipping');
      return;
    }
    let formatted = phone.trim();
    if (formatted.startsWith('0')) formatted = '+254' + formatted.slice(1);
    if (!formatted.startsWith('+')) formatted = '+254' + formatted;
    formatted = formatted.replace(/\s+/g, '');
    const response = await axios.post(
      `${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`,
      { messaging_product: 'whatsapp', to: formatted, type: 'text', text: { body: message } },
      { headers: { Authorization: `Bearer ${ACCESS_TOKEN}`, 'Content-Type': 'application/json' } }
    );
    console.log('[WhatsApp] Sent to', formatted, ':', JSON.stringify(response.data));
    return response.data;
  } catch (err) {
    const e = err.response ? JSON.stringify(err.response.data) : err.message;
    console.error('[WhatsApp] Failed:', e);
  }
};

const sendLoanApprovedWhatsApp = async (phone, loanId, amount, processingFee) => {
  const fee = processingFee || 700;
  await sendWhatsApp(phone,
    `? *Lunar Lumina Solutions*\n\nYour loan *#${loanId}* of *KSh ${parseFloat(amount).toLocaleString()}* is *APPROVED*! ??\n\nPay processing fee *KSh ${fee}* to activate:\n?? Paybill: *522522*\n?? Account: *8086860*\n\n?? 0732 378 663`
  );
};

const sendLoanDisbursedWhatsApp = async (phone, loanId, amount, totalRepayment, termWeeks) => {
  await sendWhatsApp(phone,
    `?? *Lunar Lumina Solutions*\n\nLoan *#${loanId}* of *KSh ${parseFloat(amount).toLocaleString()}* has been *DISBURSED*! ?\n\nTotal to repay: *KSh ${parseFloat(totalRepayment).toLocaleString()}* in *${termWeeks || 4} weeks*\n\n?? Paybill: *522522* | Account: *8086860*\n\nThank you! ??`
  );
};

const sendLoanRejectedWhatsApp = async (phone, loanId, reason) => {
  await sendWhatsApp(phone,
    `? *Lunar Lumina Solutions*\n\nLoan *#${loanId}* was not approved.${reason ? '\nReason: ' + reason : ''}\n\n?? 0732 378 663 | 0768 750 371\n?? Rongai, Nairobi`
  );
};

const sendPaymentReceivedWhatsApp = async (phone, amount, loanId, balance) => {
  const cleared = parseFloat(balance) === 0;
  await sendWhatsApp(phone, cleared
    ? `?? *Lunar Lumina Solutions*\n\nPayment of *KSh ${parseFloat(amount).toLocaleString()}* received for loan *#${loanId}*.\n\nYour loan is *FULLY PAID*! Thank you! ??`
    : `? *Lunar Lumina Solutions*\n\nPayment of *KSh ${parseFloat(amount).toLocaleString()}* received for loan *#${loanId}*.\n\nBalance remaining: *KSh ${parseFloat(balance).toLocaleString()}*\n?? Paybill: *522522* | Account: *8086860*`
  );
};

const sendPaymentReminderWhatsApp = async (phone, loanId, balance, dueDate) => {
  await sendWhatsApp(phone,
    `? *Lunar Lumina Solutions*\n\nReminder: Loan *#${loanId}* balance *KSh ${parseFloat(balance).toLocaleString()}* due *${dueDate}*.\n\n?? Paybill: *522522* | Account: *8086860*\n?? 0732 378 663`
  );
};

module.exports = { sendWhatsApp, sendLoanApprovedWhatsApp, sendLoanDisbursedWhatsApp, sendLoanRejectedWhatsApp, sendPaymentReceivedWhatsApp, sendPaymentReminderWhatsApp };
