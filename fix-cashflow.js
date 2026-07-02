const fs = require('fs');
const filePath = 'loan-frontend/app/reports/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Add expenses and bad debt recovery states
content = content.replace(
  `const [income, setIncome] = useState<any>({ income: [], total: 0 });`,
  `const [income, setIncome] = useState<any>({ income: [], total: 0 });
  const [totalExpensesAmount, setTotalExpensesAmount] = useState(0);
  const [totalBadDebtRecovery, setTotalBadDebtRecovery] = useState(0);`
);

// Load expenses and bad debt recovery in loadData
content = content.replace(
  `const [unmatchedRes, incomeRes] = await Promise.all([
        fetch(\`\${API}/api/payments/unmatched\`, { headers: getHeaders() }),
        fetch(\`\${API}/api/payments/income\`, { headers: getHeaders() })
      ]);
      const unmatchedData = await unmatchedRes.json();
      const incomeData = await incomeRes.json();
      setUnmatched(Array.isArray(unmatchedData) ? unmatchedData.length : 0);
      setIncome(incomeData || { income: [], total: 0 });`,
  `const [unmatchedRes, incomeRes, expensesRes, writtenOffRes] = await Promise.all([
        fetch(\`\${API}/api/payments/unmatched\`, { headers: getHeaders() }),
        fetch(\`\${API}/api/payments/income\`, { headers: getHeaders() }),
        fetch(\`\${API}/api/expenses\`, { headers: getHeaders() }),
        fetch(\`\${API}/api/expenses/written-off\`, { headers: getHeaders() })
      ]);
      const unmatchedData = await unmatchedRes.json();
      const incomeData = await incomeRes.json();
      const expensesData = await expensesRes.json();
      const writtenOffData = await writtenOffRes.json();
      setUnmatched(Array.isArray(unmatchedData) ? unmatchedData.length : 0);
      setIncome(incomeData || { income: [], total: 0 });
      setTotalExpensesAmount(expensesData.total || 0);
      setTotalBadDebtRecovery(writtenOffData.totalRecovered || 0);`
);

// Fix cash in hand formula
content = content.replace(
  `const cashInHand = capital + totalRepaid - totalDisbursed + totalIncome;`,
  `const cashInHand = capital + totalRepaid - totalDisbursed - totalExpensesAmount + totalBadDebtRecovery;`
);

// Update the cash in hand card description
content = content.replace(
  `<p className="text-xs text-gray-400 mt-1">Capital + Collected - Disbursed</p>`,
  `<p className="text-xs text-gray-400 mt-1">Capital + Collected - Disbursed - Expenses + Recoveries</p>`
);

// Add expenses line to net worth breakdown
content = content.replace(
  `<div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-600">Outstanding Loans (owed to you)</span>
                  <span className="font-bold text-blue-600">+ KSh {totalOutstanding.toLocaleString()}</span>
                </div>`,
  `<div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-600">Outstanding Loans (owed to you)</span>
                  <span className="font-bold text-blue-600">+ KSh {totalOutstanding.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-600">Total Expenses Paid</span>
                  <span className="font-bold text-red-500">- KSh {totalExpensesAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-600">Bad Debt Written Off</span>
                  <span className="font-bold text-red-700">- KSh {(totalExpensesAmount > 0 ? 0 : 0).toLocaleString()}</span>
                </div>
                {totalBadDebtRecovery > 0 && (
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-600">Bad Debt Recovered</span>
                    <span className="font-bold text-green-600">+ KSh {totalBadDebtRecovery.toLocaleString()}</span>
                  </div>
                )}`
);

// Update summary card description
content = content.replace(
  `<p className="text-xs text-gray-400 mt-1">{cashInHand < 0 ? "⚠️ Deficit" : "Available to disburse"}</p>`,
  `<p className="text-xs text-gray-400 mt-1">{cashInHand < 0 ? "⚠️ Deficit — stop disbursing" : "Available to disburse"}</p>`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Cash flow formula updated!');
console.log('Has expenses state:', content.includes('totalExpensesAmount'));
console.log('Has new formula:', content.includes('totalExpensesAmount + totalBadDebtRecovery'));