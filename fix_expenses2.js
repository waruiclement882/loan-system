const fs = require("fs");
let c = fs.readFileSync("loan-frontend/app/expenses/page.tsx", "utf8");

// 1. Add Layout import
if (!c.includes('import Layout from "../components/Layout";')) {
  c = c.replace(
    'import { useRouter } from "next/navigation";',
    'import { useRouter } from "next/navigation";\nimport Layout from "../components/Layout";'
  );
  console.log("Layout import added");
}

// 2. Replace from return( to end of header using exact positions
const returnIdx = c.indexOf("return (");
const recordExpenseEnd = c.indexOf("+ Record Expense\n          </button>\n        </div>") + "            + Record Expense\n          </button>\n        </div>".length;

// Find exact end of old header section
const periodFilterStart = c.indexOf("{/* Period Filter */}");
console.log("return at:", returnIdx, "period filter at:", periodFilterStart);

const oldSection = c.substring(returnIdx, periodFilterStart);
console.log("Old section length:", oldSection.length);

const newSection = `return (
    <Layout>
      <div className="p-4 md:p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-[#0B2545]">Expenses & P&amp;L</h1>
            <p className="text-gray-400 text-sm mt-0.5">Track costs and monthly profit &amp; loss</p>
          </div>
          <button onClick={() => setShowForm(!showForm)}
            className="bg-[#1565C0] hover:bg-[#0D47A1] text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
            + Record Expense
          </button>
        </div>
        `;

c = c.substring(0, returnIdx) + newSection + c.substring(periodFilterStart);
console.log("Header replaced");

// 3. Replace closing tags
c = c.replace(
  "      </div>\n    </div>\n  );\n}",
  "      </div>\n    </Layout>\n  );\n}"
);
console.log("Closing tag replaced");

// 4. Clean up styling
c = c.replace(/text-blue-600 border-b-2 border-blue-600 bg-blue-50\/50/g, "text-[#1565C0] border-b-2 border-[#1565C0] bg-[#EAF2FB]");
c = c.replace(/bg-blue-600 text-white border-blue-600/g, "bg-[#1565C0] text-white border-[#1565C0]");
c = c.replace(/text-slate-500 border-slate-200 hover:border-blue-300/g, "text-gray-500 border-gray-200 hover:border-[#1565C0]");
c = c.replace(/bg-slate-50/g, "bg-[#F0F2F5]");
c = c.replace(/text-slate-800/g, "text-[#0B2545]");
c = c.replace(/text-slate-400/g, "text-gray-400");
c = c.replace(/text-slate-500/g, "text-gray-500");
c = c.replace(/border-slate-200/g, "border-gray-200");

// 5. Remove emoji from tab labels
c = c.replace('"?? Expenses"', '"Expenses"');
c = c.replace('"?? P&L Report"', '"P&L Report"');
c = c.replace('"?? Summary"', '"Summary"');
c = c.replace('"?? All Loans with Payments"', '"All Loans with Payments"');
c = c.replace('"? New Loans This Month"', '"New Loans This Month"');
c = c.replace('"?? Bad Debt"', '"Bad Debt"');

fs.writeFileSync("loan-frontend/app/expenses/page.tsx", c, "utf8");
console.log("Done, final length:", c.length);
process.exit(0);
