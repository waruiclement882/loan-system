const fs = require('fs');
const files = {};
const load = (f) => {
  if (!files[f]) {
    const raw = fs.readFileSync(f, 'utf8');
    files[f] = { crlf: raw.includes('\r\n'), text: raw.replace(/\r\n/g, '\n') };
  }
  return files[f];
};
let ok = true;
const edit = (f, label, find, repl) => {
  const o = load(f);
  let n;
  if (find instanceof RegExp) {
    const re = new RegExp(find.source, 'g');
    n = (o.text.match(re) || []).length;
    if (n === 1) o.text = o.text.replace(re, repl);
  } else {
    n = o.text.split(find).length - 1;
    if (n === 1) o.text = o.text.split(find).join(repl);
  }
  if (n !== 1) { console.log(`❌ ${label}: found ${n}, expected 1`); ok = false; } else console.log(`✅ ${label}`);
};

// ---- documents.js: new types and hook ----
edit('src/routes/documents.js', 'Document types: add seven',
  /fee_receipt:\s*\{ prefix: 'FR', title: 'Processing Fee Receipt',\s*per: 'fee' \}\s*\};/,
  "fee_receipt:          { prefix: 'FR', title: 'Processing Fee Receipt',    per: 'fee' },\n" +
  "  clearance_certificate: { prefix: 'CC', title: 'Loan Clearance Certificate', per: 'loan' },\n" +
  "  write_off_memo:        { prefix: 'WO', title: 'Loan Write-off Memo',        per: 'loan' },\n" +
  "  drawing_voucher:       { prefix: 'DR', title: 'Owner Drawings Voucher',     per: 'drawing' },\n" +
  "  cash_count_sheet:      { prefix: 'CS', title: 'Cash Count Sheet',           per: 'count' },\n" +
  "  suspense_slip:         { prefix: 'SS', title: 'Customer Credit Slip',       per: 'suspense' },\n" +
  "  capital_receipt:       { prefix: 'CP', title: 'Capital Contribution Receipt', per: 'capital' },\n" +
  "  month_end_pack:        { prefix: 'MP', title: 'Month-End Pack',             per: 'month' }\n};\n\n" +
  "const EXTRA = require('./docbuilders')({ pool, one, num, isoDate, inWords: (a) => inWords(a), httpErr });");
edit('src/routes/documents.js', 'Issue: use the new builders',
  "if (T.per === 'loan') {",
  "if (EXTRA[type]) {\n    const x = await EXTRA[type](req, ids, co);\n    loanId = x.loanId; customerId = x.customerId; sourceId = x.sourceId; branchId = x.branchId; amount = x.amount; data = x.data;\n  } else if (T.per === 'loan') {");

// ---- app.js: mount the new routes ----
edit('src/app.js', 'App: require new routes',
  "const documentsRoutes = require('./routes/documents');",
  "const documentsRoutes = require('./routes/documents');\nconst docSourcesRoutes = require('./routes/docsources');\nconst capitalRoutes = require('./routes/capital');");
edit('src/app.js', 'App: mount new routes',
  "app.use('/api/documents', documentsRoutes);",
  "app.use('/api/documents', docSourcesRoutes);\napp.use('/api/documents', documentsRoutes);\napp.use('/api/capital', capitalRoutes);");

// ---- Approvals page: issue the voucher when a loan is disbursed ----
edit('loan-frontend/app/approvals/page.tsx', 'Approvals: issue voucher on disbursement',
  'else setSuccess("Loan #" + id + " disbursed successfully! Customer will be notified.");',
  'else {\n' +
  '      let note = "";\n' +
  '      try {\n' +
  '        let issued: any = null;\n' +
  '        for (let i = 0; i < 4 && !issued; i++) {\n' +
  '          const dr = await fetch(API_URL + "/api/documents/issue", { method: "POST", headers: { ...headers(), "Content-Type": "application/json" }, body: JSON.stringify({ type: "disbursement_voucher", loan_id: id }) });\n' +
  '          const dj = await dr.json();\n' +
  '          if (dr.ok) issued = dj.doc;\n' +
  '          else if (/schedule/i.test(dj.error || "")) await new Promise(r => setTimeout(r, 1500));\n' +
  '          else break;\n' +
  '        }\n' +
  '        note = issued ? " Voucher " + issued.doc_no + " issued." : " Voucher not issued yet: open Documents to issue it.";\n' +
  '      } catch { note = " Voucher not issued: open Documents to issue it."; }\n' +
  '      setSuccess("Loan #" + id + " disbursed successfully! Customer will be notified." + note);\n' +
  '    }');

// ---- Print layout and Documents page ----
edit('loan-frontend/app/doc/page.tsx', 'Doc page: import the new layouts',
  'import { useRouter, useSearchParams } from "next/navigation";',
  'import { useRouter, useSearchParams } from "next/navigation";\nimport ExtraDoc from "./extra";');
edit('loan-frontend/app/doc/page.tsx', 'Doc page: show the new layouts',
  '<p className="text-center text-[10px] text-gray-400 mt-8">',
  '<ExtraDoc doc={doc} d={d} co={co} Row={Row} Sign={Sign} money={money} fdate={fdate} />\n\n        <p className="text-center text-[10px] text-gray-400 mt-8">');
edit('loan-frontend/app/documents/page.tsx', 'Documents page: import panel',
  'import Layout from "../components/Layout";',
  'import Layout from "../components/Layout";\nimport OtherDocs from "./OtherDocs";');
edit('loan-frontend/app/documents/page.tsx', 'Documents page: show panel',
  '<h3 className="font-semibold mb-2">Register</h3>',
  '<OtherDocs />\n\n        <h3 className="font-semibold mb-2">Register</h3>');
edit('loan-frontend/app/documents/page.tsx', 'Documents page: labels',
  'payment_receipt: "Payment receipt", fee_receipt: "Fee receipt",',
  'payment_receipt: "Payment receipt", fee_receipt: "Fee receipt", clearance_certificate: "Clearance certificate", write_off_memo: "Write-off memo", drawing_voucher: "Drawings voucher", cash_count_sheet: "Cash count sheet", suspense_slip: "Credit slip", capital_receipt: "Capital receipt", month_end_pack: "Month-end pack",');

// ---- Menus: Capital tile ----
edit('loan-frontend/app/components/TopNav.tsx', 'TopNav: Capital tile',
  /\{ id:"documents",[^\n]*\},/,
  (m) => m + '\n  { id:"capital",label:"Capital",icon:"\u{1F3E6}",path:"/capital",roles:["super_admin","admin","cfo"],color:"#0B2545" },');
edit('loan-frontend/app/home/page.tsx', 'Home: Capital tile',
  /\{ id:"documents",[^\n]*\},/,
  (m) => m + '\n  { id:"capital",label:"Capital",icon:"K",path:"/capital",roles:["super_admin","admin","cfo"],color:"#0B2545",bg:"#E8EDF4",desc:"Capital log & receipts",group:"Accounting" },');

if (ok) {
  Object.entries(files).forEach(([f, o]) =>
    fs.writeFileSync(f, o.crlf ? o.text.replace(/\n/g, '\r\n') : o.text, 'utf8'));
  console.log('\n✅ Applied. Safe to push.');
} else {
  console.log('\n❌ Nothing was written. Paste this output.');
}