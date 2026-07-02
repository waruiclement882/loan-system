const fs = require('fs');
const filePath = 'loan-frontend/app/customers/[id]/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Add verifyKyc and rejectKyc functions after loadKyc
const verifyFunctions = `
  const verifyKyc = async () => {
    try {
      const res = await fetch(API + "/api/kyc/" + id + "/verify", {
        method: "PATCH", headers
      });
      const data = await res.json();
      if (data.error) alert(data.error);
      else { alert("KYC verified successfully!"); loadKyc(); loadProfile(); }
    } catch { alert("Failed to verify KYC"); }
  };

  const rejectKyc = async (reason: string) => {
    try {
      const res = await fetch(API + "/api/kyc/" + id + "/reject", {
        method: "PATCH", headers,
        body: JSON.stringify({ reason })
      });
      const data = await res.json();
      if (data.error) alert(data.error);
      else { alert("KYC rejected!"); loadKyc(); loadProfile(); }
    } catch { alert("Failed to reject KYC"); }
  };
`;

// Add after loadKyc function
content = content.replace(
  `  const loadKyc = async () => {`,
  verifyFunctions + `  const loadKyc = async () => {`
);

// Add Verify/Reject buttons after the KYC grid
const verifyButtons = `
            {/* KYC Verification Actions */}
            {kycDocs.length > 0 && (
              <div className="mt-6 pt-4 border-t">
                {kycDocs[0]?.kyc_verified ? (
                  <div className="flex items-center gap-3">
                    <span className="px-4 py-2 bg-green-100 text-green-700 rounded-lg font-medium text-sm">✅ KYC Verified</span>
                    <button onClick={() => { if(confirm('Revoke KYC verification?')) rejectKyc('KYC revoked by admin'); }}
                      className="px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200">
                      Revoke
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <p className="text-sm text-gray-500">Review documents above then:</p>
                    <button onClick={verifyKyc}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 font-medium">
                      ✅ Verify KYC
                    </button>
                    <button onClick={() => {
                      const reason = prompt('Reason for rejection:');
                      if (reason) rejectKyc(reason);
                    }} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">
                      ❌ Reject KYC
                    </button>
                  </div>
                )}
              </div>
            )}
            {kycDocs.length === 0 && (
              <p className="mt-4 text-sm text-orange-600">⚠️ Upload National ID and Passport Photo before verifying KYC</p>
            )}`;

// Add before closing div of KYC tab
content = content.replace(
  `            </div>
          </div>
        )}
        {/* Payments Tab */}`,
  verifyButtons + `
            </div>
          </div>
        )}
        {/* Payments Tab */}`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Verify/Reject buttons added!');