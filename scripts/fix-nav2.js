const fs = require('fs');

const files = [
  'loan-frontend/app/loans/page.tsx',
  'loan-frontend/app/schedule/page.tsx',
  'loan-frontend/app/audit/page.tsx',
  'loan-frontend/app/customers/page.tsx',
  'loan-frontend/app/settings/page.tsx',
  'loan-frontend/app/users/page.tsx',
  'loan-frontend/app/reports/page.tsx',
  'loan-frontend/app/payments/page.tsx',
  'loan-frontend/app/approvals/page.tsx',
  'loan-frontend/app/par/page.tsx',
];

files.forEach(f => {
  try {
    let c = fs.readFileSync(f, 'utf8');
    const before = c;

    // Fix pattern 1: broken PAR + logout buttons (users, schedule, audit, customers, settings)
    c = c.replace(
      /<button onClick=\{\(\) => \{ router\.push\("\/par"\); \}\n([ \t]*)<button onClick=\{\(\) => router\.push\("\/statement"\)\}([^\n]*)\n([ \t]*)localStorage\.clear\(\); router\.push\("\/login"\); \}\} className="([^"]*)">(Logout)<\/button>/g,
      '<button onClick={() => router.push("/par")} className="text-gray-600 hover:text-blue-600">📅 PAR</button>\n$1<button onClick={() => router.push("/statement")}$2\n$3<button onClick={() => { localStorage.clear(); router.push("/login"); }} className="$4">$5</button>'
    );

    // Fix pattern 2: missing opening <button tag before onClick={logout} (reports)
    c = c.replace(
      /\n([ \t]*)onClick=\{logout\} className="([^"]*)">(Logout)<\/button>/g,
      '\n$1<button onClick={logout} className="$2">$3</button>'
    );

    // Fix extra > on closing button tags
    c = c.replace(/<\/button>>/g, '</button>');

    fs.writeFileSync(f, c);
    console.log(before !== c ? '✅ Fixed: ' + f : '⏭️  No change: ' + f);
  } catch(e) {
    console.log('❌ Error: ' + f, e.message);
  }
});
console.log('\nDone!');
