const fs = require('fs');
const file = 'loan-frontend/app/expenses/page.tsx';
let c = fs.readFileSync(file, 'utf8');
let ok = true;

const swap = (label, from, to) => {
  const n = c.split(from).length - 1;
  if (n !== 1) { console.log(`❌ ${label}: found ${n} match(es), expected 1`); ok = false; return; }
  c = c.replace(from, () => to);
  console.log(`✅ ${label}`);
};

const swapRegex = (label, re, to) => {
  const n = (c.match(new RegExp(re.source, 'g')) || []).length;
  if (n !== 1) { console.log(`❌ ${label}: found ${n} match(es), expected 1`); ok = false; return; }
  c = c.replace(re, to);
  console.log(`✅ ${label}`);
};

// 1. Header: add a Status column after Amount
swap('Header: Status column',
  '["Date","Category","Description","Method","Ref","Amount",""]',
  '["Date","Category","Description","Method","Ref","Amount","Status",""]');

// 2. Row: grey out anything that is not approved
swap('Row: grey out pending/rejected',
  '<tr key={exp.id} className="border-b border-slate-50 hover:bg-slate-50">',
  '<tr key={exp.id} className={"border-b border-slate-50 hover:bg-slate-50" + (exp.status && exp.status !== "approved" ? " opacity-60" : "")}>');

// 3. Description: show the rejection reason under it
swap('Description: rejection reason',
  '<td className="py-3 px-3 text-slate-700">{exp.description}</td>',
  '<td className="py-3 px-3 text-slate-700">{exp.description}{exp.status === "rejected" && exp.rejection_reason && (<span className="block text-xs text-red-500">Rejected: {exp.rejection_reason}</span>)}</td>');

// 4. Status badge after the Amount cell
swap('Row: status badge',
  '<td className="py-3 px-3 font-bold text-red-600">KES {fmt(exp.amount)}</td>',
  '<td className="py-3 px-3 font-bold text-red-600">KES {fmt(exp.amount)}</td>\n' +
  '                            <td className="py-3 px-3"><span className={"text-xs px-2 py-0.5 rounded-full font-medium " + ((exp.status || "approved") === "approved" ? "bg-green-100 text-green-700" : exp.status === "rejected" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700")}>{(exp.status || "approved").charAt(0).toUpperCase() + (exp.status || "approved").slice(1)}</span></td>');

// 5. Actions: voucher link on approved rows, next to Delete
swap('Row: voucher link',
  '<button onClick={() => handleDelete(exp.id)} className="text-xs text-red-400 hover:text-red-600 border border-red-200 px-2 py-1 rounded-lg">Delete</button>',
  '<div className="flex gap-2 items-center">' +
  '{(exp.status || "approved") === "approved" && (<button onClick={() => router.push("/voucher?id=" + exp.id)} className="text-xs text-blue-600 hover:text-blue-800 border border-blue-200 px-2 py-1 rounded-lg">Voucher</button>)}' +
  '<button onClick={() => handleDelete(exp.id)} className="text-xs text-red-400 hover:text-red-600 border border-red-200 px-2 py-1 rounded-lg">Delete</button>' +
  '</div>');

// 6. Footer: keep columns aligned (extra empty cell) and label the total
swapRegex('Footer: extra cell',
  /(KES \{fmt\(totalExpenses\)\}<\/td>)\s*<td><\/td>/,
  '$1\n                          <td></td>\n                          <td></td>');

swapRegex('Footer: label',
  /(<td colSpan=\{5\}[^>]*>)Total(<\/td>)(\s*<td[^>]*>KES \{fmt\(totalExpenses\)\}<\/td>)/,
  '$1Total (approved only)$2$3');

if (ok) {
  fs.writeFileSync(file, c, 'utf8');
  console.log('\n✅ All changes applied. Safe to push.');
} else {
  console.log('\n❌ Nothing was written. Paste this output and I will adjust.');
}