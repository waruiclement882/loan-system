const sendSms = async (phone, message) => {
  try {
    if (!process.env.AT_API_KEY || !process.env.AT_USERNAME) {
      console.warn('[SMSService] Africa\'s Talking credentials not set — skipping SMS');
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
  await sendSms(phone, `Your loan of KSh ${parseFloat(amount).toLocaleString()} (ID: #${loanId}) has been approved. Disbursement is being processed.`);
};

const sendLoanDisbursedSms = async (phone, loanId, amount, paybill) => {
  await sendSms(phone, `Loan #${loanId} of KSh ${parseFloat(amount).toLocaleString()} disbursed. Repay via KCB Paybill ${paybill || ''}, Account: ${loanId}.`);
};

const sendLoanRejectedSms = async (phone, loanId) => {
  await sendSms(phone, `Your loan application #${loanId} was not approved. Please contact us for more information.`);
};

const sendPaymentReceivedSms = async (phone, amount, loanId, balance) => {
  const msg = parseFloat(balance) === 0
    ? `Payment of KSh ${parseFloat(amount).toLocaleString()} received for loan #${loanId}. Loan fully paid! Thank you.`
    : `Payment of KSh ${parseFloat(amount).toLocaleString()} received for loan #${loanId}. Remaining balance: KSh ${parseFloat(balance).toLocaleString()}.`;
  await sendSms(phone, msg);
};

module.exports = { sendSms, sendLoanApprovedSms, sendLoanDisbursedSms, sendLoanRejectedSms, sendPaymentReceivedSms };
