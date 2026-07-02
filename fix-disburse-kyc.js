const fs = require('fs');
const filePath = 'loan-frontend/app/approvals/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Add KYC check before processing fee check
content = content.replace(
  `disburseLoan = async (id: number, loan: any) => {
    setError(""); setSuccess("");
    if (loan.processing_fee > 0 && !loan.processing_fee_paid) {`,
  `disburseLoan = async (id: number, loan: any) => {
    setError(""); setSuccess("");
    // Check KYC verification
    try {
      const kycRes = await fetch(API_URL + "/api/kyc/" + loan.customer_id, { headers: headers() });
      const kycData = await kycRes.json();
      if (!kycData || !kycData.kyc_verified) {
        setError("Cannot disburse Loan #" + id + " — Customer KYC is not verified. Please verify National ID and Passport Photo first.");
        return;
      }
    } catch (e) {
      setError("Cannot disburse — KYC check failed. Please try again.");
      return;
    }
    if (loan.processing_fee > 0 && !loan.processing_fee_paid) {`
);

// Fix missing closing brace in original disburseLoan
content = content.replace(
  `      return;
    setActionLoading(id);`,
  `      return;
    }
    setActionLoading(id);`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Disburse KYC check added!');