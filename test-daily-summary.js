require('dotenv').config();
const { sendDailySummary, sendWeeklySummary } = require('./src/services/cronService');

console.log('Sending daily summary...');
sendDailySummary().then(() => {
  console.log('Done! Check your email.');
  setTimeout(() => process.exit(), 3000);
});