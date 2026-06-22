const fs = require('fs');
const path = require('path');

const pages = [
  'loan-frontend/app/dashboard/page.tsx',
  'loan-frontend/app/matching/page.tsx',
  'loan-frontend/app/reports/page.tsx',
  'loan-frontend/app/loans/page.tsx',
  'loan-frontend/app/payments/page.tsx',
  'loan-frontend/app/customers/page.tsx',
  'loan-frontend/app/approvals/page.tsx',
  'loan-frontend/app/audit/page.tsx',
  'loan-frontend/app/par/page.tsx',
];

// The nav link to find (Reports button) and what to insert after it
const findPattern = `router.push("/reports")} className="text-gray-600 hover:text-blue-600">Reports</button>}`;
const replacement = `router.push("/reports")} className="text-gray-600 hover:text-blue-600">Reports</button>}
          {isAdmin && <button onClick={() => router.push("/par")} className="text-gray-600 hover:text-blue-600">📅 PAR</button>}
          <button onClick={() => router.push("/statement")} className="text-gray-600 hover:text-blue-600">Statement</button>`;

// Alternative pattern without {isAdmin &&
const findPattern2 = `router.push("/reports")} className="text-gray-600 hover:text-blue-600">Reports</button>`;
const replacement2 = `router.push("/reports")} className="text-gray-600 hover:text-blue-600">Reports</button>
          <button onClick={() => router.push("/par")} className="text-gray-600 hover:text-blue-600">📅 PAR</button>
          <button onClick={() => router.push("/statement")} className="text-gray-600 hover:text-blue-600">Statement</button>`;

let updated = 0;
let skipped = 0;

pages.forEach(filePath => {
  if (!fs.existsSync(filePath)) {
    console.log(`⏭️  Skipped (not found): ${filePath}`);
    skipped++;
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');

  // Check if already has PAR link
  if (content.includes('router.push("/par")') && content.includes('router.push("/statement")')) {
    console.log(`✅ Already has PAR & Statement: ${filePath}`);
    return;
  }

  // Try pattern 1 (with isAdmin wrapper)
  if (content.includes(findPattern)) {
    content = content.replace(findPattern, replacement);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Updated: ${filePath}`);
    updated++;
    return;
  }

  // Try pattern 2 (without isAdmin wrapper)
  if (content.includes(findPattern2)) {
    content = content.replace(findPattern2, replacement2);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Updated: ${filePath}`);
    updated++;
    return;
  }

  console.log(`⚠️  Pattern not found in: ${filePath}`);
  skipped++;
});

console.log(`\n=== DONE ===`);
console.log(`Updated: ${updated} files`);
console.log(`Skipped: ${skipped} files`);
