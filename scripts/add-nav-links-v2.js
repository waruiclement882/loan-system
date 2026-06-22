const fs = require('fs');

const pages = [
  'loan-frontend/app/matching/page.tsx',
  'loan-frontend/app/reports/page.tsx',
  'loan-frontend/app/payments/page.tsx',
  'loan-frontend/app/customers/page.tsx',
  'loan-frontend/app/approvals/page.tsx',
  'loan-frontend/app/audit/page.tsx',
  'loan-frontend/app/par/page.tsx',
  'loan-frontend/app/loans/page.tsx',
  'loan-frontend/app/statement/page.tsx',
  'loan-frontend/app/schedule/page.tsx',
  'loan-frontend/app/collection/page.tsx',
  'loan-frontend/app/export/page.tsx',
  'loan-frontend/app/users/page.tsx',
  'loan-frontend/app/settings/page.tsx',
];

// All possible patterns for the Reports button
const patterns = [
  {
    find: `router.push("/reports")} className="text-gray-600 hover:text-blue-600 text-sm">Reports</button>`,
    after: `
          <button onClick={() => router.push("/par")} className="text-gray-600 hover:text-blue-600 text-sm">📅 PAR</button>
          <button onClick={() => router.push("/statement")} className="text-gray-600 hover:text-blue-600 text-sm">Statement</button>`
  },
  {
    find: `router.push("/reports")} className="text-gray-600 hover:text-blue-600">Reports</button>`,
    after: `
          <button onClick={() => router.push("/par")} className="text-gray-600 hover:text-blue-600">📅 PAR</button>
          <button onClick={() => router.push("/statement")} className="text-gray-600 hover:text-blue-600">Statement</button>`
  },
  {
    find: `router.push("/reports")} className="text-gray-600 hover:text-blue-600 text-sm">Reports</button>}`,
    after: `}
          <button onClick={() => router.push("/par")} className="text-gray-600 hover:text-blue-600 text-sm">📅 PAR</button>
          <button onClick={() => router.push("/statement")} className="text-gray-600 hover:text-blue-600 text-sm">Statement</button>`
  },
];

let updated = 0;

pages.forEach(filePath => {
  if (!fs.existsSync(filePath)) {
    console.log(`⏭️  Not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');

  if (content.includes('router.push("/par")')) {
    console.log(`✅ Already updated: ${filePath}`);
    return;
  }

  let matched = false;
  for (const { find, after } of patterns) {
    if (content.includes(find)) {
      content = content.replace(find, find + after);
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Updated: ${filePath}`);
      updated++;
      matched = true;
      break;
    }
  }

  if (!matched) {
    // Show what the Reports button looks like in this file
    const lines = content.split('\n');
    const reportLine = lines.find(l => l.includes('Reports'));
    console.log(`⚠️  No match in: ${filePath}`);
    if (reportLine) console.log(`   Found: ${reportLine.trim()}`);
    else console.log(`   No Reports button found`);
  }
});

console.log(`\n✅ Updated ${updated} files`);
