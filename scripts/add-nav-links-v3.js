const fs = require('fs');

const pages = [
  'loan-frontend/app/loans/page.tsx',
  'loan-frontend/app/payments/page.tsx',
  'loan-frontend/app/customers/page.tsx',
  'loan-frontend/app/approvals/page.tsx',
  'loan-frontend/app/audit/page.tsx',
  'loan-frontend/app/par/page.tsx',
  'loan-frontend/app/statement/page.tsx',
  'loan-frontend/app/schedule/page.tsx',
  'loan-frontend/app/export/page.tsx',
  'loan-frontend/app/users/page.tsx',
  'loan-frontend/app/settings/page.tsx',
  'loan-frontend/app/reports/page.tsx',
  'loan-frontend/app/matching/page.tsx',
];

// All possible logout button patterns
const logoutPatterns = [
  `localStorage.clear(); router.push("/login"); }} className="text-red-500 hover:text-red-700">Logout</button>`,
  `localStorage.clear(); router.push("/login"); }} className="text-red-500 hover:text-red-700 text-sm">Logout</button>`,
  `localStorage.clear(); router.push("/login"); }} className="text-red-500 text-sm">Logout</button>`,
  `localStorage.clear(); router.push("/login"); }} className="text-red-500">Logout</button>`,
];

const parStatement = (cls) => `<button onClick={() => router.push("/par")} className="${cls}">📅 PAR</button>
          <button onClick={() => router.push("/statement")} className="${cls}">Statement</button>
          `;

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
  for (const pattern of logoutPatterns) {
    if (content.includes(pattern)) {
      // Determine class from pattern
      const cls = pattern.includes('text-sm')
        ? 'text-gray-600 hover:text-blue-600 text-sm'
        : 'text-gray-600 hover:text-blue-600';

      content = content.replace(pattern, parStatement(cls) + pattern);
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Updated: ${filePath}`);
      updated++;
      matched = true;
      break;
    }
  }

  if (!matched) {
    const lines = content.split('\n');
    const logoutLine = lines.find(l => l.includes('Logout'));
    console.log(`⚠️  No match in: ${filePath}`);
    if (logoutLine) console.log(`   Logout line: ${logoutLine.trim()}`);
  }
});

console.log(`\n✅ Updated ${updated} files`);
