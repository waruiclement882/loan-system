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
];

const parButton = '<button onClick={() => router.push("/par")} className="text-gray-600 hover:text-blue-600">📅 PAR</button>';
const parButtonSm = '<button onClick={() => router.push("/par")} className="text-gray-600 hover:text-blue-600 text-sm">📅 PAR</button>';

files.forEach(f => {
  try {
    let c = fs.readFileSync(f, 'utf8');
    const before = c;

    // Fix pattern 1: { <button ...>PAR</button>  (inside onClick handler)
    c = c.replace(
      /\{ <button onClick=\{\(\) => router\.push\("\/par"\)\} className="text-gray-600 hover:text-blue-600">📅 PAR<\/button>/g,
      '{ router.push("/par"); }'
    );
    c = c.replace(
      /\{ <button onClick=\{\(\) => router\.push\("\/par"\)\} className="text-gray-600 hover:text-blue-600 text-sm">📅 PAR<\/button>/g,
      '{ router.push("/par"); }'
    );

    // Fix pattern 2: <button <button ...>PAR</button>  (double button tag)
    c = c.replace(
      /<button <button onClick=\{\(\) => router\.push\("\/par"\)\} className="text-gray-600 hover:text-blue-600 text-sm">📅 PAR<\/button>/g,
      parButtonSm
    );
    c = c.replace(
      /<button <button onClick=\{\(\) => router\.push\("\/par"\)\} className="text-gray-600 hover:text-blue-600">📅 PAR<\/button>/g,
      parButton
    );

    fs.writeFileSync(f, c);
    console.log(before !== c ? '✅ Fixed: ' + f : '⏭️  No change: ' + f);
  } catch(e) {
    console.log('❌ Error: ' + f, e.message);
  }
});

console.log('\nDone!');
