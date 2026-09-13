const fs = require('fs');
const c = fs.readFileSync('loan-frontend/app/customers/[id]/page.tsx', 'utf8');
const i = c.indexOf('activeTab === "kyc"');
console.log('Found at index:', i);
if (i > -1) {
  console.log(c.substring(i, i + 2000));
} else {
  console.log('KYC tab NOT found - searching for kyc section...');
  const j = c.indexOf('handleKycUpload');
  console.log(c.substring(j - 100, j + 1000));
}