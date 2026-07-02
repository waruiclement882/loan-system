const fs = require('fs');
const filePath = 'loan-frontend/app/customers/[id]/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Fix loadKyc to store the object directly
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
      setKycDocs(Array.isArray(data) ? data : (data && !data.error ? [data] : []));
    } catch {}
  };`
);

// Fix the existing check - API returns object with national_id_url, passport_photo_url
content = content.replace(
  `const existing = kycDocs.find((d: any) => d.document_type === doc.key);`,
  `const existing = kycDocs.length > 0 ? kycDocs[0][doc.key + '_url'] : null;`
);

// Fix existing usage - now existing is a URL string not an object
content = content.replace(
  `{existing ? (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">✓ Uploaded</span>
                      ) : (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs">Missing</span>
                      )}`,
  `{existing ? (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">✓ Uploaded</span>
                      ) : (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs">Missing</span>
                      )}`
);

// Fix view document link
content = content.replace(
  `<a href={existing.document_url} target="_blank" rel="noreferrer"`,
  `<a href={existing} target="_blank" rel="noreferrer"`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ KYC status fixed!');