const fs = require("fs");
let c = fs.readFileSync("loan-frontend/app/expenses/page.tsx", "utf8");

// Fix tab labels with emojis
c = c.replace('{ key: "expenses", label: "?? Expenses" }', '{ key: "expenses", label: "Expenses" }');
c = c.replace('{ key: "pnl", label: "?? P&L Report" }', '{ key: "pnl", label: "P&L Report" }');
c = c.replace('{ key: "summary", label: "?? Summary" }', '{ key: "summary", label: "Summary" }');
c = c.replace('{ key: "all_loans", label: "?? All Loans with Payments" }', '{ key: "all_loans", label: "All Loans with Payments" }');
c = c.replace('{ key: "new_loans", label: "? New Loans This Month" }', '{ key: "new_loans", label: "New Loans This Month" }');
c = c.replace('{ key: "bad_debt", label: "?? Bad Debt" }', '{ key: "bad_debt", label: "Bad Debt" }');

// Fix P&amp;L back to P&L in JSX text (not attributes)
c = c.replace('Expenses & P&amp;L', 'Expenses & P&L');
c = c.replace('Track costs and monthly profit &amp; loss', 'Track costs and monthly profit & loss');

// Update main content area background
c = c.replace('className="p-4 md:p-6 max-w-6xl mx-auto"', 'className="p-4 md:p-6 max-w-6xl mx-auto min-h-screen bg-[#F0F2F5]"');

// Fix period filter selects
c = c.replace(/className="border border-gray-200 rounded-lg px-3 py-1\.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-\[#1565C0\]\/30">/g,
  'className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1565C0]/30">');

// Fix Record Expense save button  
c = c.replace('"?? Save"', '"Save Expense"');
c = c.replace(/"?? Saving\.\.\."/g, '"Saving..."');

// Fix print button
c = c.replace('??? Print', 'Print');

// Fix alert icons
c = c.replace('"?"', '"OK"');
c = c.replace('"??"', '"!"');

// Fix written off table emoji
c = c.replace('? Fully Paid', 'Fully Paid');
c = c.replace('"? Save"', '"Save"');

fs.writeFileSync("loan-frontend/app/expenses/page.tsx", c, "utf8");
console.log("Done, length:", c.length);

// Verify tabs
const check = c.indexOf('Main Tabs');
console.log("Tabs section:", c.substring(check, check+300));
process.exit(0);
