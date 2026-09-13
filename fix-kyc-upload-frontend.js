const fs = require('fs');
const filePath = 'loan-frontend/app/customers/[id]/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  `formData.append("document", file);
      formData.append("document_type", docType);
      formData.append("customer_id", id as string);
      const res = await fetch(API + "/api/kyc/upload", {
        method: "POST",
        headers: { Authorization: "Bearer " + token },
        body: formData
      });
      const data = await res.json();
      if (data.error) alert(data.error);
      else { alert("Docu`,
  `formData.append("document", file);
      formData.append("doc_type", docType);
      const res = await fetch(API + "/api/kyc/" + id + "/upload", {
        method: "POST",
        headers: { Authorization: "Bearer " + token },
        body: formData
      });
      const data = await res.json();
      if (data.error) alert(data.error);
      else { alert("Docu`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ KYC upload URL and field name fixed!');
console.log('Has correct URL:', content.includes('"/api/kyc/" + id + "/upload"'));
console.log('Has doc_type:', content.includes('"doc_type"'));