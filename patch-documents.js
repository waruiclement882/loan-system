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

edit('src/app.js', 'Documents route: require',
  "const vouchersRoutes = require('./routes/vouchers');",
  "const vouchersRoutes = require('./routes/vouchers');\nconst documentsRoutes = require('./routes/documents');");
edit('src/app.js', 'Documents route: mount',
  "app.use('/api/vouchers', vouchersRoutes);",
  "app.use('/api/vouchers', vouchersRoutes);\napp.use('/api/documents', documentsRoutes);");

edit('loan-frontend/app/components/TopNav.tsx', 'TopNav: Documents tile',
  /\{ id:"collection",[^\n]*\},/,
  (m) => m + '\n  { id:"documents",label:"Documents",icon:"\u{1F4C4}",path:"/documents",roles:["super_admin","admin","branch_admin","cashier","cfo"],color:"#0B6B6E" },');
edit('loan-frontend/app/home/page.tsx', 'Home: Documents tile',
  /\{ id:"collection",[^\n]*\},/,
  (m) => m + '\n  { id:"documents",label:"Documents",icon:"J",path:"/documents",roles:["super_admin","admin","branch_admin","cashier","cfo"],color:"#0B6B6E",bg:"#E4F2F2",desc:"Vouchers, agreements & receipts",group:"Records" },');

if (ok) {
  Object.entries(files).forEach(([f, o]) =>
    fs.writeFileSync(f, o.crlf ? o.text.replace(/\n/g, '\r\n') : o.text, 'utf8'));
  console.log('\n✅ Applied. Safe to push.');
} else {
  console.log('\n❌ Nothing was written. Paste this output.');
}