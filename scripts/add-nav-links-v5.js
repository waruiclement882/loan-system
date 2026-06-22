const fs = require('fs');

const fixes = [
  {
    file: 'loan-frontend/app/payments/page.tsx',
    find: `router.push("/export")} className="text-gray-600 hover:text-blue-600">Export</button>`,
    add: `\n          <button onClick={() => router.push("/par")} className="text-gray-600 hover:text-blue-600">📅 PAR</button>\n          <button onClick={() => router.push("/statement")} className="text-gray-600 hover:text-blue-600">Statement</button>`
  },
  {
    file: 'loan-frontend/app/approvals/page.tsx',
    find: null // will detect below
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

// For files where we need to detect the last nav button
const detectAndFix = (filePath) => {
  if (!fs.existsSync(filePath)) {
    console.log(`⏭️  Not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');

  if (content.includes('router.push("/par")')) {
    console.log(`✅ Already updated: ${filePath}`);
    return;
  }

  // Find all router.push nav buttons
  const lines = content.split('\n');
  const navLines = lines.filter(l =>
    l.includes('router.push') &&
    l.includes('className=') &&
    (l.includes('text-gray-600') || l.includes('text-blue-600')) &&
    !l.includes('/login') &&
    !l.includes('loan.id') &&
    !l.includes('loans/')
  );

  if (navLines.length === 0) {
    console.log(`⚠️  No nav buttons found in: ${filePath}`);
    return;
  }

  // Use the last nav button as anchor
  const lastNavLine = navLines[navLines.length - 1].trim();
  console.log(`   Last nav: ${lastNavLine}`);

  // Detect class
  const cls = lastNavLine.includes('text-sm')
    ? 'text-gray-600 hover:text-blue-600 text-sm'
    : 'text-gray-600 hover:text-blue-600';

  const toAdd = `\n          <button onClick={() => router.push("/par")} className="${cls}">📅 PAR</button>\n          <button onClick={() => router.push("/statement")} className="${cls}">Statement</button>`;

  if (content.includes(lastNavLine)) {
    content = content.replace(lastNavLine, lastNavLine + toAdd);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Updated: ${filePath}`);
  } else {
    console.log(`⚠️  Could not insert in: ${filePath}`);
  }
};

// Fix payments with known pattern
const paymentsFile = 'loan-frontend/app/payments/page.tsx';
if (fs.existsSync(paymentsFile)) {
  let content = fs.readFileSync(paymentsFile, 'utf8');
  if (content.includes('router.push("/par")')) {
    console.log(`✅ Already updated: ${paymentsFile}`);
  } else {
    const find = `router.push("/export")} className="text-gray-600 hover:text-blue-600">Export</button>`;
    if (content.includes(find)) {
      content = content.replace(find, find + `\n          <button onClick={() => router.push("/par")} className="text-gray-600 hover:text-blue-600">📅 PAR</button>\n          <button onClick={() => router.push("/statement")} className="text-gray-600 hover:text-blue-600">Statement</button>`);
      fs.writeFileSync(paymentsFile, content, 'utf8');
      console.log(`✅ Updated: ${paymentsFile}`);
    }
  }
}

// Auto-detect for remaining files
['loan-frontend/app/approvals/page.tsx',
 'loan-frontend/app/statement/page.tsx',
 'loan-frontend/app/export/page.tsx'].forEach(detectAndFix);
