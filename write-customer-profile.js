const fs = require('fs');
const filePath = 'loan-frontend/app/customers/[id]/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Find where KYC tab content should be and add it
// Look for Payments Tab comment and add KYC tab before it
const kycTabContent = `
        {/* KYC Tab */}
        {activeTab === "kyc" && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-bold text-lg mb-4">KYC Documents</h3>
            
            {/* KYC Status Banner */}
            {kycDocs.length > 0 && kycDocs[0]?.kyc_verified && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                <span className="text-green-600 font-medium">✅ KYC Verified</span>
                <span className="text-green-500 text-sm">— This customer is verified and eligible for loans</span>
              </div>
            )}
            {kycDocs.length > 0 && !kycDocs[0]?.kyc_verified && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <span className="text-yellow-700 font-medium">⚠️ KYC Pending Verification</span>
              </div>
            )}

            {/* Document Upload Grid */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {[
                { key: "national_id", label: "National ID" },
                { key: "passport_photo", label: "Passport Photo" }
              ].map(doc => {
                const url = kycDocs.length > 0 ? kycDocs[0][doc.key + "_url"] : null;
                return (
                  <div key={doc.key} className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-3">
                      <p className="font-medium text-sm">{doc.label}</p>
                      {url ? (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">✓ Uploaded</span>
                      ) : (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs">Missing</span>
                      )}
                    </div>
                    {url && (
                      <div className="mb-3">
                        <a href={url} target="_blank" rel="noreferrer"
                          className="text-blue-600 hover:underline text-xs flex items-center gap-1">
                          👁 View Document
                        </a>
                      </div>
                    )}
                    <div>
                      <input type="file" id={"kyc-" + doc.key} className="hidden"
                        accept=".jpg,.jpeg,.png,.pdf"
                        onChange={e => handleKycUpload(e, doc.key)} />
                      <label htmlFor={"kyc-" + doc.key}
                        className="cursor-pointer inline-block px-3 py-1.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700">
                        {uploading ? "Uploading..." : url ? "Replace" : "Upload"}
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Verify / Reject Buttons */}
            <div className="border-t pt-4">
              {kycDocs.length === 0 ? (
                <p className="text-sm text-orange-600">⚠️ Upload National ID and Passport Photo before verifying KYC</p>
              ) : kycDocs[0]?.kyc_verified ? (
                <div className="flex items-center gap-3">
                  <span className="text-green-600 font-medium text-sm">✅ KYC is Verified</span>
                  <button onClick={() => { if(confirm("Revoke KYC verification?")) rejectKyc("KYC revoked by admin"); }}
                    className="px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200">
                    Revoke Verification
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3 flex-wrap">
                  <p className="text-sm text-gray-500">Review documents then:</p>
                  <button onClick={verifyKyc}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 font-medium">
                    ✅ Verify KYC
                  </button>
                  <button onClick={() => {
                    const reason = prompt("Reason for rejection:");
                    if (reason) rejectKyc(reason);
                  }} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">
                    ❌ Reject KYC
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
`;

// Find the Payments Tab and insert KYC tab before it
if (content.includes('{/* Payments Tab */}')) {
  content = content.replace('{/* Payments Tab */}', kycTabContent + '\n        {/* Payments Tab */}');
  console.log('✅ KYC tab inserted before Payments Tab!');
} else if (content.includes('activeTab === "payments"')) {
  content = content.replace('{activeTab === "payments"', kycTabContent + '\n        {activeTab === "payments"');
  console.log('✅ KYC tab inserted!');
} else {
  console.log('❌ Could not find insertion point!');
  // Show what tabs exist
  const matches = content.match(/activeTab === "[^"]+"/g);
  console.log('Found tabs:', matches);
}

fs.writeFileSync(filePath, content, 'utf8');