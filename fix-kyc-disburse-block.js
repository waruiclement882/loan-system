const fs = require('fs');
const filePath = 'loan-frontend/app/approvals/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const API = process.env.NEXT_PUBLIC_API_URL || "https://loan-system-h794.onrender.com";

// Add KYC check before processing fee check
content = content.replace(
  `disburseLoan = async (id: number, loan: any) => {
    setError(""); setSuccess("");
    if (loan.processing_fee > 0 && !loan.processing_fee_paid) {`,
  `disburseLoan = async (id: number, loan: any) => {
    setError(""); setSuccess("");

    // Check KYC verification first
    try {
      const token = localStorage.getItem("token");
      const kycRes = await fetch(\`https://loan-system-h794.onrender.com/api/kyc/\${loan.customer_id}\`, {
        headers: { Authorization: "Bearer " + token }
      });
      const kycData = await kycRes.json();
      if (!kycData || !kycData.kyc_verified) {
        setError("❌ Cannot disburse Loan #" + id + " — Customer KYC is NOT verified. Go to Customer Profile → KYC Documents to upload and verify ID.");
        return;
      }
    } catch {
      setError("❌ Cannot disburse — KYC verification check failed. Please try again.");
      return;
    }

    if (loan.processing_fee > 0 && !loan.processing_fee_paid) {`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ KYC block added to disburseLoan!');
console.log('Has KYC check:', content.includes('kyc_verified'));
console.log('Has KYC error message:', content.includes('KYC is NOT verified'));