const fs = require('fs');

// Update dashboard nav to include export link
let dashboard = fs.readFileSync('loan-frontend/app/dashboard/page.tsx', 'utf8');
dashboard = dashboard.replace(
  '<button onClick={logout} className="text-red-500 hover:text-red-700">Logout</button>',
  '<button onClick={() => router.push("/export")} className="text-gray-600 hover:text-blue-600">Export</button>\n          <button onClick={logout} className="text-red-500 hover:text-red-700">Logout</button>'
);
fs.writeFileSync('loan-frontend/app/dashboard/page.tsx', dashboard, 'utf8');

// Update approvals nav
let approvals = fs.readFileSync('loan-frontend/app/approvals/page.tsx', 'utf8');
approvals = approvals.replace(
  '<button onClick={() => router.push("/payments")} className="text-gray-600 hover:text-blue-600">Payments</button>',
  '<button onClick={() => router.push("/payments")} className="text-gray-600 hover:text-blue-600">Payments</button>\n          <button onClick={() => router.push("/export")} className="text-gray-600 hover:text-blue-600">Export</button>'
);
fs.writeFileSync('loan-frontend/app/approvals/page.tsx', approvals, 'utf8');

// Update loans nav
let loans = fs.readFileSync('loan-frontend/app/loans/page.tsx', 'utf8');
loans = loans.replace(
  '<button onClick={() => router.push("/payments")} className="text-gray-600 hover:text-blue-600">Payments</button>',
  '<button onClick={() => router.push("/payments")} className="text-gray-600 hover:text-blue-600">Payments</button>\n          <button onClick={() => router.push("/export")} className="text-gray-600 hover:text-blue-600">Export</button>\n          <button onClick={() => router.push("/approvals")} className="text-gray-600 hover:text-blue-600">Approvals</button>'
);
fs.writeFileSync('loan-frontend/app/loans/page.tsx', loans, 'utf8');

// Update payments nav
let payments = fs.readFileSync('loan-frontend/app/payments/page.tsx', 'utf8');
payments = payments.replace(
  '<button onClick={() => router.push("/loans")} className="text-gray-600 hover:text-blue-600">Loans</button>',
  '<button onClick={() => router.push("/loans")} className="text-gray-600 hover:text-blue-600">Loans</button>\n          <button onClick={() => router.push("/approvals")} className="text-gray-600 hover:text-blue-600">Approvals</button>\n          <button onClick={() => router.push("/export")} className="text-gray-600 hover:text-blue-600">Export</button>'
);
fs.writeFileSync('loan-frontend/app/payments/page.tsx', payments, 'utf8');

console.log('All navs updated!');
