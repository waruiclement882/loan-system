const fs = require('fs');
const filePath = 'loan-frontend/app/customers/[id]/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Replace the upload section in KYC tab with camera + upload options
content = content.replace(
  `                    <div>
                      <input type="file" id={"kyc-" + doc.key} className="hidden"
                        accept=".jpg,.jpeg,.png,.pdf"
                        onChange={e => handleKycUpload(e, doc.key)} />
                      <label htmlFor={"kyc-" + doc.key}
                        className={"cursor-pointer px-3 py-1.5 rounded-lg text-xs inline-block font-medium " + (uploading ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-blue-600 text-white hover:bg-blue-700")}>
                        {uploading ? "Uploading..." : url ? "🔄 Replace" : "📤 Upload"}
                      </label>
                    </div>`,
  `                    <div className="flex gap-2 flex-wrap">
                      {/* Upload from file/gallery */}
                      <input type="file" id={"kyc-upload-" + doc.key} className="hidden"
                        accept="image/*,.pdf"
                        onChange={e => handleKycUpload(e, doc.key)} />
                      <label htmlFor={"kyc-upload-" + doc.key}
                        className={"cursor-pointer px-3 py-1.5 rounded-lg text-xs inline-block font-medium " + (uploading ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-blue-600 text-white hover:bg-blue-700")}>
                        {uploading ? "Uploading..." : "📁 Upload"}
                      </label>
                      {/* Take photo with camera */}
                      <input type="file" id={"kyc-camera-" + doc.key} className="hidden"
                        accept="image/*"
                        capture="environment"
                        onChange={e => handleKycUpload(e, doc.key)} />
                      <label htmlFor={"kyc-camera-" + doc.key}
                        className={"cursor-pointer px-3 py-1.5 rounded-lg text-xs inline-block font-medium " + (uploading ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-green-600 text-white hover:bg-green-700")}>
                        📷 Camera
                      </label>
                    </div>`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Camera capture added!');
console.log('Has camera input:', content.includes('capture="environment"'));