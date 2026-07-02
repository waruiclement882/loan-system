const fs = require('fs');
const filePath = 'loan-frontend/app/customers/[id]/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Fix loadKyc - API returns single object not array
content = content.replace(
  /const loadKyc = async \(\) => \{[\s\S]*?\};/,
  `const loadKyc = async () => {
    try {
      const res = await fetch(API + "/api/kyc/" + id, { headers });
      const data = await res.json();
      // API returns single object with national_id_url, passport_photo_url
      if (data && !data.error && data.customer_id) {
        setKycDocs([data]);
      } else {
        setKycDocs([]);
      }
    } catch {}
  };`
);

// Fix existing check - look for national_id_url or passport_photo_url
content = content.replace(
  `const existing = kycDocs.find((d: any) => d.document_type === doc.key);`,
  `const existing = kycDocs.length > 0 ? kycDocs[0][doc.key + '_url'] : null;`
);

// Fix view document link - existing is now a URL string
content = content.replace(
  `<a href={existing.document_url} target="_blank" rel="noreferrer"`,
  `<a href={existing} target="_blank" rel="noreferrer"`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ KYC status fixed!');

// Verify
const result = fs.readFileSync(filePath, 'utf8');
console.log('Has correct check:', result.includes("doc.key + '_url'"));