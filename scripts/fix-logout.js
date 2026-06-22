const fs = require('fs');

const fixes = [
  {
    file: 'loan-frontend/app/users/page.tsx',
    find: `          <button onClick={() => router.push("/statement")} className="text-gray-600 hover:text-blue-600 text-sm">Statement</button>\n          localStorage.clear(); router.push("/login"); }} className="text-red-500 hover:text-red-700 text-sm">Logout</button>`,
    replace: `          <button onClick={() => router.push("/par")} className="text-gray-600 hover:text-blue-600 text-sm">\uD83D\uDCC5 PAR</button>\n          <button onClick={() => router.push("/statement")} className="text-gray-600 hover:text-blue-600 text-sm">Statement</button>\n          <button onClick={() => { localStorage.clear(); router.push("/login"); }} className="text-red-500 hover:text-red-700 text-sm">Logout</button>`
  },
  {
    file: 'loan-frontend/app/schedule/page.tsx',
    find: `          localStorage.clear(); router.push("/login"); }} className="text-red-500 hover:text-red-700">Logout</button>`,
    replace: `          <button onClick={() => { localStorage.clear(); router.push("/login"); }} className="text-red-500 hover:text-red-700">Logout</button>`
  },
  {
    file: 'loan-frontend/app/audit/page.tsx',
    find: `          localStorage.clear(); router.push("/login"); }} className="text-red-500 text-sm">Logout</button>`,
    replace: `          <button onClick={() => { localStorage.clear(); router.push("/login"); }} className="text-red-500 text-sm">Logout</button>`
  },
  {
    file: 'loan-frontend/app/customers/page.tsx',
    find: `          localStorage.clear(); router.push("/login"); }} className="text-red-500 hover:text-red-700">Logout</button>`,
    replace: `          <button onClick={() => { localStorage.clear(); router.push("/login"); }} className="text-red-500 hover:text-red-700">Logout</button>`
  },
  {
    file: 'loan-frontend/app/settings/page.tsx',
    find: `          localStorage.clear(); router.push("/login"); }} className="text-red-500 hover:text-red-700">Logout</button>`,
    replace: `          <button onClick={() => { localStorage.clear(); router.push("/login"); }} className="text-red-500 hover:text-red-700">Logout</button>`
  },
];

fixes.forEach(({ file, find, replace }) => {
  try {
    let c = fs.readFileSync(file, 'utf8');
    if (c.includes(find)) {
      c = c.replace(find, replace);
      fs.writeFileSync(file, c);
      console.log('✅ Fixed: ' + file);
    } else {
      console.log('⏭️  Pattern not found: ' + file);
    }
  } catch(e) {
    console.log('❌ Error: ' + file, e.message);
  }
});
console.log('\nDone!');
