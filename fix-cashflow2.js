const fs = require('fs');
const filePath = 'loan-frontend/app/reports/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Fix cash in hand formula to include processing fees and float income
content = content.replace(
  `const cashInHand = capital + totalRepaid - totalDisbursed - totalExpensesAmount + totalBadDebtRecovery;`,
  `const cashInHand = capital + totalRepaid + totalIncome - totalDisbursed - totalExpensesAmount + totalBadDebtRecovery;`
);

// Fix the net worth breakdown - remove duplicates and add processing fees
const oldBreakdown = `<div className="flex justify-between items-center py-2 border-b">
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
                )}`;

const newBreakdown = `<div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-600">Outstanding Loans (owed to you)</span>
                  <span className="font-bold text-blue-600">+ KSh {totalOutstanding.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-600">Processing Fees & Float Income</span>
                  <span className="font-bold text-indigo-600">+ KSh {totalIncome.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-600">Total Expenses Paid</span>
                  <span className="font-bold text-red-500">- KSh {totalExpensesAmount.toLocaleString()}</span>
                </div>
                {totalBadDebtRecovery > 0 && (
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-600">Bad Debt Recovered</span>
                    <span className="font-bold text-green-600">+ KSh {totalBadDebtRecovery.toLocaleString()}</span>
                  </div>
                )}`;

content = content.replace(oldBreakdown, newBreakdown);

// Also fix the description
content = content.replace(
  `<p className="text-xs text-gray-400 mt-1">Capital + Collected - Disbursed - Expenses + Recoveries</p>`,
  `<p className="text-xs text-gray-400 mt-1">Capital + Collected + Fees - Disbursed - Expenses</p>`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Cash flow formula fixed!');
console.log('Has correct formula:', content.includes('totalRepaid + totalIncome - totalDisbursed'));