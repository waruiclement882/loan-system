require('dotenv').config();
const axios = require('axios');

const getToken = async () => {
  const response = await axios.post(
    process.env.KCB_TOKEN_URL,
    'grant_type=client_credentials',
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      auth: {
        username: process.env.KCB_CONSUMER_KEY,
        password: process.env.KCB_CONSUMER_SECRET
      }
    }
  );
  return response.data.access_token;
};

const tryRegister = async (token, url, payload) => {
  try {
    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    console.log(`✅ SUCCESS at ${url}:`, JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    console.log(`❌ FAILED at ${url}:`, error.response?.data || error.message);
    return false;
  }
};

const registerIPN = async () => {
  try {
    console.log('Getting token...');
    const token = await getToken();
    console.log('✅ Token obtained!\n');

    const callbackUrl = 'https://loan-system-h794.onrender.com/webhooks/kcb';
    const paybill = process.env.KCB_PAYBILL || '522522';

    // Try different endpoint formats
    const endpoints = [
      {
        url: 'https://uat.buni.kcbgroup.com/ipn/1.0.0/ipnregistration',
        payload: { CallBackURL: callbackUrl, PayBillNumber: paybill }
      },
      {
        url: 'https://uat.buni.kcbgroup.com/ipn/1.0.0/registration',
        payload: { CallBackURL: callbackUrl, PayBillNumber: paybill }
      },
      {
        url: 'https://uat.buni.kcbgroup.com/InstantPaymentNotification/1.0.0/ipnregistration',
        payload: { CallBackURL: callbackUrl, PayBillNumber: paybill }
      },
      {
        url: 'https://uat.buni.kcbgroup.com/InstantPaymentNotification/1.0.0/registration',
        payload: { CallBackURL: callbackUrl, PayBillNumber: paybill }
      },
      {
        url: 'https://api.buni.kcbgroup.com/ipn/1.0.0/ipnregistration',
        payload: { CallBackURL: callbackUrl, PayBillNumber: paybill }
      },
      {
        url: 'https://api.buni.kcbgroup.com/InstantPaymentNotification/1.0.0/ipnregistration',
        payload: { CallBackURL: callbackUrl, PayBillNumber: paybill }
      }
    ];

    for (const endpoint of endpoints) {
      console.log(`Trying: ${endpoint.url}`);
      const success = await tryRegister(token, endpoint.url, endpoint.payload);
      if (success) break;
    }

  } catch (error) {
    console.error('Token error:', error.response?.data || error.message);
  }
};

registerIPN();