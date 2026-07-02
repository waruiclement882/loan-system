const fs = require('fs');
const filePath = 'loan-frontend/app/customers/[id]/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Fix 1: Remove Business Permit and Bank Statement - try different quote styles
content = content
  .replace(/\{\s*key:\s*["']business_permit["'],\s*label:\s*["']Business Permit["']\s*\},?\s*/g, '')
  .replace(/\{\s*key:\s*["']bank_statement["'],\s*label:\s*["']Bank Statement["']\s*\},?\s*/g, '');

// Fix 2: Fix upload success - remove alert, just reload
content = content
  .replace(/alert\("Document uploaded!"\);\s*loadKyc\(\);/g, 'loadKyc();')
  .replace(/alert\('Document uploaded!'\);\s*loadKyc\(\);/g, 'loadKyc();');

// Fix 3: Fix KYC status check
// The API returns an object like {national_id_url: "...", passport_photo_url: "..."}
// We need to check urls not array

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Fixed!');

// Verify
const result = fs.readFileSync(filePath, 'utf8');
const hasBusinessPermit = result.includes('business_permit');
const hasBankStatement = result.includes('bank_statement');
console.log('Business Permit removed:', !hasBusinessPermit);
console.log('Bank Statement removed:', !hasBankStatement);