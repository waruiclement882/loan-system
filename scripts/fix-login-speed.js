const fs = require('fs');

const file = 'src/controllers/authController.js';
let content = fs.readFileSync(file, 'utf8');

// Fix 1: Make email sending fire-and-forget (don't await)
// Find the await emailService.sendEmail block and remove await
const fixes = [
  // Remove await from OTP email send
  {
    find: `      await emailService.sendEmail({
        to: user.email,
        subject: 'Your Blessed Ventures Login Code',`,
    replace: `      // Fire email async - don't block login response
      emailService.sendEmail({
        to: user.email,
        subject: 'Your Blessed Ventures Login Code',`
  },
  // Remove await from resend email
  {
    find: `      await emailService.sendEmail({
        to: user.email,
        subject: 'Your New Login Code — Blessed Ventures',`,
    replace: `      emailService.sendEmail({
        to: user.email,
        subject: 'Your New Login Code — Blessed Ventures',`
  },
  // Remove await from SMS send in login
  {
    find: `      await smsService.sendSms(user.phone,
        \`Your Blessed Ventures login code is: \${otp}. Valid for 3 minutes. Do not share this code.\`
      );`,
    replace: `      smsService.sendSms(user.phone,
        \`Your Blessed Ventures login code is: \${otp}. Valid for 3 minutes. Do not share this code.\`
      ).catch(e => console.error('[SMS OTP]', e.message));`
  },
  // Remove await from SMS send in resend
  {
    find: `      await smsService.sendSms(user.phone, \`Your Blessed Ventures login code is: \${otp}. Valid for 3 minutes.\`);`,
    replace: `      smsService.sendSms(user.phone, \`Your Blessed Ventures login code is: \${otp}. Valid for 3 minutes.\`).catch(e => console.error('[SMS Resend]', e.message));`
  }
];

let fixed = 0;
fixes.forEach(({ find, replace }) => {
  if (content.includes(find)) {
    content = content.replace(find, replace);
    fixed++;
    console.log(`✅ Fixed: ${find.slice(0, 60)}...`);
  } else {
    console.log(`⚠️  Not found: ${find.slice(0, 60)}...`);
  }
});

fs.writeFileSync(file, content, 'utf8');
console.log(`\n✅ ${fixed} fixes applied to authController.js`);
