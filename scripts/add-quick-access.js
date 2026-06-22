const fs = require('fs');

let content = fs.readFileSync('loan-frontend/app/reports/page.tsx', 'utf8');

// Add quick access section after the <div className="p-6"> opening
const insertAfter = `  return (
    <div className="min-h-screen bg-gray-100">
      {/* Nav */}`;

const quickAccessCards = `  return (
    <div className="min-h-screen bg-gray-100">
      {/* Nav */}`;

// Find the right place to insert - after the stats grid, before recent payments
// Insert quick access cards section
const insertPoint = '  const recentPayments = [...payments]';

const newSection = `  // Quick access tools
  const quickTools = [
    { label: 'PAR Report', desc: 'Portfolio at Risk analysis', path: '/par', color: 'bg-red-500' },
    { label: 'Collection Sheet', desc: 'Daily collection by date', path: '/collection', color: 'bg-green-600' },
    { label: 'Loan Statement', desc: 'Printable per-loan statement', path: '/statement', color: 'bg-blue-600' },
    { label: 'Audit Logs', desc: 'Activity & audit trail', path: '/audit', color: 'bg-purple-600' },
    { label: 'Export Data', desc: 'Export to Excel', path: '/export', color: 'bg-orange-500' },
  ];

  const recentPayments = [...payments]`;

content = content.replace(insertPoint, newSection);

// Now add the quick access UI in the JSX - find a good place after the stats cards
const jsxInsertPoint = `{/* Recent Payments`;
const quickAccessJSX = `{/* Quick Access Tools */}
        <div className="mb-6">
          <h3 className="font-bold text-lg mb-3">Quick Access</h3>
          <div className="grid grid-cols-5 gap-3">
            {quickTools.map((tool: any) => (
              <button key={tool.path} onClick={() => router.push(tool.path)}
                className={"text-white p-4 rounded-lg hover:opacity-90 text-left " + tool.color}>
                <p className="font-bold text-sm">{tool.label}</p>
                <p className="text-xs opacity-80 mt-1">{tool.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Payments`;

content = content.replace(jsxInsertPoint, quickAccessJSX);

fs.writeFileSync('loan-frontend/app/reports/page.tsx', content, 'utf8');
console.log('Reports page updated with quick access!');
