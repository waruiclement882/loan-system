const fs = require("fs");
let c = fs.readFileSync("loan-frontend/app/expenses/page.tsx", "utf8");

// 1. Add Layout import
c = c.replace(
  'import { useRouter } from "next/navigation";',
  'import { useRouter } from "next/navigation";\nimport Layout from "../components/Layout";'
);

// 2. Replace old nav + header with Layout + new header
const oldHeader = `  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <h1 className="text-xl font-bold text-blue-600">Microfinance System</h1>
        <div className="flex gap-4 text-sm">
          {["dashboard","loans","customers","payments"].map(p => (
            <button key={p} onClick={() => router.push("/"+p)} className="text-slate-500 hover:text-blue-600 capitalize">{p}</button>
          ))}
          <button onClick={() => router.push("/reports")} className="text-slate-500 hover:text-blue-600">Reports</button>
          <button onClick={() => { localStorage.clear(); router.push("/login"); }} className="text-red-400 hover:text-red-600">Logout</button>
        </div>
      </nav>

      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">?? Expenses & P&L</h2>
            <p className="text-slate-400 text-sm mt-0.5">Track costs and monthly profit & loss</p>
          </div>
          <button onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700">
            + Record Expense
          </button>
        </div>`;

const newHeader = `  return (
    <Layout>
      <div className="p-4 md:p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-[#0B2545]">Expenses & P&L</h1>
            <p className="text-gray-400 text-sm mt-0.5">Track costs and monthly profit & loss</p>
          </div>
          <button onClick={() => setShowForm(!showForm)}
            className="bg-[#1565C0] hover:bg-[#0D47A1] text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
            + Record Expense
          </button>
        </div>`;

if (c.includes(oldHeader)) {
  c = c.replace(oldHeader, newHeader);
  console.log("Header replaced OK");
} else {
  console.log("ERROR: Header pattern not found");
  process.exit(1);
}

// 3. Replace closing tags - old: </div></div> new: </div></Layout>
c = c.replace(
  `      </div>
    </div>
  );
}`,
  `      </div>
    </Layout>
  );
}`
);

// 4. Update tab styling - replace blue-600 tabs with new colors
c = c.replace(
  /text-blue-600 border-b-2 border-blue-600 bg-blue-50\/50/g,
  "text-[#1565C0] border-b-2 border-[#1565C0] bg-[#EAF2FB]"
);

// 5. Update Record Expense button in form
c = c.replace(
  /className="bg-blue-600 text-white px-\d+ py-\d+ rounded-\w+ text-sm font-medium hover:bg-blue-700"/g,
  'className="bg-[#1565C0] hover:bg-[#0D47A1] text-white px-5 py-2 rounded-xl text-sm font-semibold transition-colors"'
);

// 6. Replace emoji tab labels with clean text
c = c.replace('{ key: "expenses", label: "?? Expenses" }', '{ key: "expenses", label: "Expenses" }');
c = c.replace('{ key: "pnl", label: "?? P&L Report" }', '{ key: "pnl", label: "P&L Report" }');
c = c.replace('{ key: "summary", label: "?? Summary" }', '{ key: "summary", label: "Summary" }');
c = c.replace('{ key: "all_loans", label: "?? All Loans with Payments" }', '{ key: "all_loans", label: "All Loans with Payments" }');
c = c.replace('{ key: "new_loans", label: "? New Loans This Month" }', '{ key: "new_loans", label: "New Loans This Month" }');
c = c.replace('{ key: "bad_debt", label: "?? Bad Debt" }', '{ key: "bad_debt", label: "Bad Debt" }');

// 7. Update period filter styling
c = c.replace(
  'className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300">',
  'className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1565C0]/30">'
);

// 8. Update category filter pills
c = c.replace(
  /bg-blue-600 text-white border-blue-600/g,
  "bg-[#1565C0] text-white border-[#1565C0]"
);
c = c.replace(
  /text-slate-500 border-slate-200 hover:border-blue-300/g,
  "text-gray-500 border-gray-200 hover:border-[#1565C0]"
);

// 9. Update background
c = c.replace(/bg-slate-50/g, "bg-[#F0F2F5]");
c = c.replace(/text-slate-800/g, "text-[#0B2545]");
c = c.replace(/text-slate-400/g, "text-gray-400");
c = c.replace(/text-slate-500/g, "text-gray-500");
c = c.replace(/border-slate-200/g, "border-gray-200");

fs.writeFileSync("loan-frontend/app/expenses/page.tsx", c, "utf8");
console.log("Done, length:", c.length);
process.exit(0);
