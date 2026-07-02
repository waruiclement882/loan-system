const fs = require('fs');
const filePath = 'loan-frontend/app/customers/[id]/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Fix 1: field name
content = content.replace(
  'formData.append("document_type", docType);',
  'formData.append("doc_type", docType);'
);

// Fix 2: URL
content = content.replace(
  'API + "/api/kyc/upload"',
  'API + "/api/kyc/" + id + "/upload"'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Fixed KYC upload!');