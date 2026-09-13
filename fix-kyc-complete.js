const fs = require('fs');
const filePath = 'loan-frontend/app/customers/[id]/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const kycStart = content.indexOf('activeTab === "kyc" &&');
const kycEnd = content.indexOf('      )}\n      </div>', kycStart);

console.log('KYC start:', kycStart, 'KYC end:', kycEnd);

const newKycTab = `activeTab === "kyc" && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-bold text-lg mb-4">🪪 KYC Documents</h3>

            {/* KYC Status Banner */}
            {kycDocs.length > 0 && kycDocs[0]?.kyc_verified && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-green-600 text-lg">✅</span>
                  <div>
                    <p className="text-green-700 font-medium text-sm">KYC Verified</p>
                    <p className="text-green-500 text-xs">Customer is verified and eligible for loans</p>
                  </div>
                </div>
                <button onClick={rejectKyc} className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-xs hover:bg-red-200">Revoke</button>
              </div>
            )}
            {kycDocs.length > 0 && !kycDocs[0]?.kyc_verified && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-700 font-medium text-sm">⚠️ KYC Pending — Documents uploaded but not yet verified</p>
              </div>
            )}
            {kycDocs.length === 0 && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 font-medium text-sm">❌ KYC Not Started — Upload National ID and Passport Photo</p>
              </div>
            )}

            {/* Document Upload Grid - Only National ID and Passport Photo */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {[
                { key: "national_id", label: "🪪 National ID", urlKey: "national_id_url" },
                { key: "passport_photo", label: "📸 Passport Photo", urlKey: "passport_photo_url" }
              ].map(doc => {
                const docData = kycDocs.length > 0 ? kycDocs[0] : null;
                const url = docData ? docData[doc.urlKey] : null;
                return (
                  <div key={doc.key} className={"border-2 rounded-lg p-4 " + (url ? "border-green-300 bg-green-50" : "border-dashed border-gray-300 bg-gray-50")}>
                    <div className="flex justify-between items-center mb-3">
                      <p className="font-medium text-sm">{doc.label}</p>
                      {url ? (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">✓ Uploaded</span>
                      ) : (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs">Missing</span>
                      )}
                    </div>
                    {url && (
                      <div className="mb-3">
                        <a href={url} target="_blank" rel="noreferrer"
                          className="text-blue-600 hover:underline text-sm flex items-center gap-1">
                          👁 View Document
                        </a>
                      </div>
                    )}
                    <div>
                      <input type="file" id={"kyc-" + doc.key} className="hidden"
                        accept=".jpg,.jpeg,.png,.pdf"
                        onChange={e => handleKycUpload(e, doc.key)} />
                      <label htmlFor={"kyc-" + doc.key}
                        className={"cursor-pointer px-3 py-1.5 rounded-lg text-xs inline-block font-medium " + (uploading ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-blue-600 text-white hover:bg-blue-700")}>
                        {uploading ? "Uploading..." : url ? "🔄 Replace" : "📤 Upload"}
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Verify / Reject Actions */}
            <div className="border-t pt-4">
              {kycDocs.length === 0 ? (
                <p className="text-sm text-gray-400 italic">⬆️ Upload both documents to enable verification</p>
              ) : !kycDocs[0]?.national_id_url || !kycDocs[0]?.passport_photo_url ? (
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="text-sm text-orange-600 font-medium">⚠️ Upload BOTH National ID and Passport Photo before verifying</p>
                </div>
              ) : kycDocs[0]?.kyc_verified ? (
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                  <span className="text-green-600 font-medium text-sm">✅ KYC Verified — Loan disbursement is allowed</span>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-gray-600 mb-3">Both documents uploaded. Please review and verify:</p>
                  <div className="flex items-center gap-3">
                    <button onClick={verifyKyc}
                      className="px-5 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 font-medium">
                      ✅ Verify KYC
                    </button>
                    <button onClick={rejectKyc}
                      className="px-5 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 font-medium">
                      ❌ Reject KYC
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}`;

content = content.substring(0, kycStart) + newKycTab;
fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ KYC tab replaced successfully!');
console.log('Has verifyKyc:', content.includes('verifyKyc'));
console.log('Has national_id_url:', content.includes('national_id_url'));
console.log('Has rejectKyc:', content.includes('rejectKyc'));