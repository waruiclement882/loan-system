const fs = require('fs');
const filePath = 'loan-frontend/app/customers/[id]/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Fix 1: Remove Business Permit and Bank Statement
content = content.replace(
  `const docTypes = [
    { key: "national_id", label: "National ID" },
    { key: "passport_photo", label: "Passport Photo" },
    { key: "business_permit", label: "Business Permit" },
    { key: "bank_statement", label: "Bank Statement" },
  ];`,
  `const docTypes = [
    { key: "national_id", label: "National ID" },
    { key: "passport_photo", label: "Passport Photo" },
  ];`
);

// Fix 2: Fix KYC status display - check from kycDocs object not array
content = content.replace(
  'else { alert("Document uploaded!"); loadKyc(); }',
  'else { loadKyc(); }'
);

// Fix 3: Fix loadKyc to handle object response
content = content.replace(
  `const loadKyc = async () => {
    try {
      const res = await fetch(API + "/api/kyc/" + id, { headers });
      const data = await res.json();
      setKycDocs(Array.isArray(data) ? data : []);
    } catch {}
  };`,
  `const loadKyc = async () => {
    try {
      const res = await fetch(API + "/api/kyc/" + id, { headers });
      const data = await res.json();
      // Handle both array and object responses
      if (Array.isArray(data)) setKycDocs(data);
      else if (data && typeof data === 'object' && !data.error) setKycDocs([data]);
      else setKycDocs([]);
    } catch {}
  };`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ KYC display fixed!');