const fs = require('fs');

// Each entry: file, exact string to find, class to use for new buttons
const fixes = [
  {
    file: 'loan-frontend/app/loans/page.tsx',
    find: `          localStorage.clear(); router.push("/login"); }} className="text-red-500 hover:text-red-700">Logout</button>`,
    cls: 'text-gray-600 hover:text-blue-600'
  },
  {
    file: 'loan-frontend/app/schedule/page.tsx',
    find: `          localStorage.clear(); router.push("/login"); }} className="text-red-500 hover:text-red-700">Logout</button>`,
    cls: 'text-gray-600 hover:text-blue-600'
  },
  {
    file: 'loan-frontend/app/audit/page.tsx',
    find: `          localStorage.clear(); router.push("/login"); }} className="text-red-500 text-sm">Logout</button>`,
    cls: 'text-gray-600 hover:text-blue-600 text-sm'
  },
  {
    file: 'loan-frontend/app/customers/page.tsx',
    find: `          localStorage.clear(); router.push("/login"); }} className="text-red-500 hover:text-red-700">Logout</button>`,
    cls: 'text-gray-600 hover:text-blue-600'
  },
  {
    file: 'loan-frontend/app/par/page.tsx',
    find: `          localStorage.clear(); router.push("/login"); }} className="text-red-400 hover:text-red-600">Logout</button>`,
    cls: 'text-gray-600 hover:text-blue-600'
  },
  {
    file: 'loan-frontend/app/settings/page.tsx',
    find: `          localStorage.clear(); router.push("/login"); }} className="text-red-500 hover:text-red-700">Logout</button>`,
    cls: 'text-gray-600 hover:text-blue-600'
  },
  {
    file: 'loan-frontend/app/users/page.tsx',
    find: `          localStorage.clear(); router.push("/login"); }} className="text-red-500 hover:text-red-700 text-sm">Logout</button>`,
    cls: 'text-gray-600 hover:text-blue-600 text-sm'
  },
  {
    file: 'loan-frontend/app/matching/page.tsx',
    find: `          <button onClick={() => { localStorage.clear(); router.push("/login"); }} className="text-red-500 text-sm">Logout</button>`,
    cls: 'text-gray-600 hover:text-blue-600 text-sm'
  },
  {
    file: 'loan-frontend/app/reports/page.tsx',
    find: `          onClick={logout} className="text-red-500 text-sm">Logout</button>`,
    cls: 'text-gray-600 hover:text-blue-600 text-sm'
  },
];

// Pages with no Logout button - add after last nav button
const noLogoutPages = [
  {
    file: 'loan-frontend/app/payments/page.tsx',
    find: `router.push("/export")} className="text-gray-600 hover:text-blue-600">Export</button>`,
    cls: 'text-gray-600 hover:text-blue-600'
  },
  {
    file: 'loan-frontend/app/approvals/page.tsx',
    find: null // will detect
  },
  {
    file: 'loan-frontend/app/statement/page.tsx',
    find: null
  },
  {
    file: 'loan-frontend/app/export/page.tsx',
    find: null
  },
];

let updated = 0;

// Fix pages WITH Logout button - insert PAR/Statement BEFORE the Logout line
fixes.forEach(({ file, find, cls }) => {
  if (!fs.existsSync(file)) { console.log(`⏭️  Not found: ${file}`); return; }
  let content = fs.readFileSync(file, 'utf8');

  if (content.includes('router.push("/par")')) {
    console.log(`✅ Already done: ${file}`); return;
  }

  if (!content.includes(find)) {
    console.log(`⚠️  Pattern not found in: ${file}`);
    console.log(`   Looking for: ${find.trim()}`);
    return;
  }

  const parBtn = `          <button onClick={() => router.push("/par")} className="${cls}">📅 PAR</button>\n`;
  const stmtBtn = `          <button onClick={() => router.push("/statement")} className="${cls}">Statement</button>\n`;

  // Insert BEFORE the logout line
  content = content.replace(find, parBtn + stmtBtn + find);
  fs.writeFileSync(file, content, 'utf8');
  console.log(`✅ Updated: ${file}`);
  updated++;
});

// Fix pages WITHOUT Logout button - insert AFTER the found button
noLogoutPages.forEach(({ file, find, cls }) => {
  if (!fs.existsSync(file)) { console.log(`⏭️  Not found: ${file}`); return; }
  let content = fs.readFileSync(file, 'utf8');

  if (content.includes('router.push("/par")')) {
    console.log(`✅ Already done: ${file}`); return;
  }

  // Auto-detect last nav button if find is null
  let target = find;
  let targetCls = cls;
  if (!target) {
    const lines = content.split('\n');
    const navLines = lines.filter(l =>
      l.includes('router.push') &&
      l.includes('className=') &&
      l.includes('text-gray-600') &&
      !l.includes('/login') &&
      !l.includes('loan.id') &&
      !l.includes('loans/')
    );
    if (navLines.length === 0) {
      console.log(`⚠️  No nav buttons in: ${file}`); return;
    }
    target = navLines[navLines.length - 1].trim();
    targetCls = target.includes('text-sm') ? 'text-gray-600 hover:text-blue-600 text-sm' : 'text-gray-600 hover:text-blue-600';
    console.log(`   Auto-detected last nav: ${target}`);
  }

  if (!content.includes(target)) {
    console.log(`⚠️  Pattern not found in: ${file}`); return;
  }

  const parBtn = `\n          <button onClick={() => router.push("/par")} className="${targetCls}">📅 PAR</button>`;
  const stmtBtn = `\n          <button onClick={() => router.push("/statement")} className="${targetCls}">Statement</button>`;

  content = content.replace(target, target + parBtn + stmtBtn);
  fs.writeFileSync(file, content, 'utf8');
  console.log(`✅ Updated: ${file}`);
  updated++;
});

console.log(`\n✅ Total updated: ${updated} files`);

// Verify - check for any corruption
console.log('\n=== VERIFICATION ===');
const allFiles = [...fixes.map(f => f.file), ...noLogoutPages.map(f => f.file)];
allFiles.forEach(file => {
  if (!fs.existsSync(file)) return;
  const content = fs.readFileSync(file, 'utf8');
  const hasCorruption = content.includes('{ <button') || content.includes('<button <button');
  const hasPar = content.includes('router.push("/par")');
  console.log(`${file.split('/').pop()}: PAR=${hasPar ? '✅' : '❌'} Corruption=${hasCorruption ? '❌ YES' : '✅ None'}`);
});
