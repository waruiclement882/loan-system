const fs = require('fs');
const filePath = 'loan-frontend/app/loans/[id]/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Add writeOff function after loadData
const writeOffFunction = `
  const handleWriteOff = async () => {
    const reason = prompt("Reason for writing off this loan?");
    if (!reason) return;
    if (!confirm("Are you sure you want to write off Loan #" + loanId + "? This cannot be undone.")) return;
    try {
      const res = await fetch(API + "/api/loans/" + loanId + "/write-off", {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ reason })
      });
      const data = await res.json();
      if (data.error) alert("Error: " + data.error);
      else { alert("Loan written off successfully!"); loadData(); }
    } catch { alert("Failed to write off loan"); }
  };
`;

// Insert after loadData closing brace
content = content.replace(
  'setLoading(false);\n  };',
  'setLoading(false);\n  };\n' + writeOffFunction
);

// Add written_off to statusBadge
content = content.replace(
  `pending: "bg-amber-100 text-amber-700",\n  }[s] || "bg-gray-100 text-gray-600")`,
  `pending: "bg-amber-100 text-amber-700",\n    written_off: "bg-gray-300 text-gray-700",\n  }[s] || "bg-gray-100 text-gray-600")`
);

// Add Write Off button after Back to Loans button
content = content.replace(
  `← Back to Loans\n        </button>`,
  `← Back to Loans\n        </button>\n        {loan && loan.status === "active" && (() => {\n          const overdueWeeks = schedule.filter((s: any) => s.status === "overdue");\n          const firstOverdue = overdueWeeks.length > 0 ? new Date(overdueWeeks[0].due_date) : null;\n          const daysOverdue = firstOverdue ? Math.floor((new Date().getTime() - firstOverdue.getTime()) / (1000 * 60 * 60 * 24)) : 0;\n          return daysOverdue >= 40 ? (\n            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between flex-wrap gap-2">\n              <div>\n                <p className="font-semibold text-red-700">⚠️ Loan Overdue {daysOverdue} Days</p>\n                <p className="text-red-500 text-sm">This loan qualifies for bad debt write-off (40+ days overdue)</p>\n              </div>\n              <button onClick={handleWriteOff}\n                className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700 font-medium">\n                ✕ Write Off Loan\n              </button>\n            </div>\n          ) : null;\n        })()}\n        {loan && loan.status === "written_off" && (\n          <div className="mb-4 p-4 bg-gray-100 border border-gray-300 rounded-xl">\n            <p className="font-semibold text-gray-700">✕ This loan has been written off as bad debt</p>\n            <p className="text-gray-500 text-sm mt-1">Balance of KSh {parseFloat(loan.balance||0).toLocaleString()} written off</p>\n          </div>\n        )}`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Write-off button added!');