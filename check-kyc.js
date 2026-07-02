const fs = require('fs');
const c = fs.readFileSync('loan-frontend/app/customers/[id]/page.tsx', 'utf8');
const i = c.indexOf('Verify KYC');
if (i === -1) {
  console.log('❌ Verify KYC button NOT found in file!');
  // Show KYC tab section
  const j = c.indexOf('KYC Documents');
  console.log('KYC Documents section:');
  console.log(c.substring(j, j + 1500));
} else {
  console.log('✅ Verify KYC button found at index:', i);
  console.log(c.substring(i - 200, i + 500));
}