const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'loan-frontend', 'app', 'reports', 'page.tsx');

const content = `"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCustomers, getLoans, getPayments } from "@/lib/api";

export default function ReportsPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loans, setLoans] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [income, setIncome] = useState<any>({ income: [], total: 0 });
  const [userRole, setUserRole] = useState("");
  const [userName, setUserName] = useState("");
  const [unmatched, setUnmatched] = useState(0);
  const [showPar, setShowPar] = useState(false);
  const [showCollection, setShowCollection] = useState(false);
  const [showIncome, setShowIncome] = useState(false);
  const [collectionDate, setCollectionDate] = useState(new Date().toISOString().split("T")[0]);
  const [parData, setParData] = useState<any[]>([]);

  const API = process.env.NEXT_PUBLIC_API_URL || "https://loan-system-h794.onrender.com";

  const getHeaders = () => {
    const token = localStorage.getItem("token");
    return { "Content-Type": "application/json", Authorization: \`Bearer \${token}\` };
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    setUserRole(user.role || "");
    setUserName(user.name || user.full_name || "");
    loadData();
  }, []);

  const loadData = async () => {
    const [c, l, p] = await Promise.all([getCustomers(), getLoans(), getPayments()]);
    setCustomers(Array.isArray(c) ? c : []);
    setLoans(Array.isArray(l) ? l : []);
    setPayments(Array.isArray(p) ? p : []);
    try {
      const [unmatchedRes, incomeRes] = await Promise.all([
        fetch(\`\${API}/api/payments/unmatched\`, { headers: getHeaders() }),
        fetch(\`\${API}/api/payments/income\`, { headers: getHeaders() })
      ]);
      const unmatchedData = await unmatchedRes.json();
      const incomeData = await incomeRes.json();
      setUnmatched(Array.isArray(unmatchedData) ? unmatchedData.length : 0);
      setIncome(incomeData || { income: [], total: 0 });
    } catch {}
  };

  const logout = () => { localStorage.clear(); router.push("/login"); };
  const isAdmin = ["admin", "cashier"].includes(userRole);
  const pendingLoans = loans.filter(l => l.status === "pending").length;
  const today = new Date();

  const totalDisbursed = loans.filter(l => ["active","paid"].includes(l.status)).reduce((s, l) => s + parseFloat(l.amount || 0), 0);
  const totalRepaid = payments.reduce((s, p) => s + parseFloat(p.amount || 0), 0);
  const totalOutstanding = loans.filter(l => l.status === "active").reduce((s, l) => s + parseFloat(l.balance || 0), 0);
  const activeLoans = loans.filter(l => l.status === "active").length;
  const paidLoans = loans.filter(l => l.status === "paid").length;
  const collectionRate = totalDisbursed > 0 ? Math.round((totalRepaid / totalDisbursed) * 100) : 0;
  const activeCustomers = customers.filter(c => loans.some(l => l.customer_id === c.id && l.status === "active")).length;
  const newThisMonth = customers.filter(c => {
    const created = new Date(c.created_at);
    return created.getMonth() === today.getMonth() && created.getFullYear() === today.getFullYear();
  }).length;
  const recentPayments = [...payments].sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()).slice(0, 10);
  const totalIncome = parseFloat(income.total || 0);
  const processingFeeCount = (income.income || []).length;

  const calculatePAR = () => {
    const par = loans.filter(l => l.status === "active").map(loan => {
      const balance = parseFloat(loan.balance || 0);
      const total = parseFloat(loan.total_amount || 0);
      const collected = total - balance;
      const disbursedDate = new Date(loan.disbursed_at || loan.created_at);
      const weeksPassed = Math.floor((today.getTime() - disbursedDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
      const weeklyAmount = total / (loan.term_weeks || 6);
      const expectedByNow = Math.min(weeksPassed * weeklyAmount, total);
      const arrears = Math.max(0, expectedByNow - collected);
      return { ...loan, arrears, weeksPassed, expectedByNow, collected };
    }).filter(l => l.arrears > 0);
    setParData(par);
    setShowPar(true);
    setShowCollection(false);
    setShowIncome(false);
  };

  const collectionPayments = payments.filter(p => {
    const d = new Date(p.payment_date).toISOString().split("T")[0];
    return d === collectionDate;
  });

  const exportCSV = (data: any[][], filename: string) => {
    const csv = data.map(row => row.map(cell => \`"\${cell ?? ""}"\`).join(",")).join("\\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const exportLoans = () => exportCSV([
    ["ID","Customer","Amount","Total","Balance","Status","Officer","Date"],
    ...loans.map(l => [l.id, l.customer_name, l.amount, l.total_amount, l.balance, l.status, l.created_by_name||"", new Date(l.created_at).toLocaleDateString()])
  ], "loans.csv");

  const exportPayments = () => exportCSV([
    ["ID","Loan ID","Amount","Source","Transaction Code","Date"],
    ...payments.map(p => [p.id, p.loan_id, p.amount, p.source, p.transaction_code||"", new Date(p.payment_date).toLocaleDateString()])
  ], "payments.csv");

  const exportCustomers = () => exportCSV([
    ["ID","Name","Phone","Email","National ID","Date Joined"],
    ...customers.map(c => [c.id, c.name, c.phone, c.email||"", c.national_id||"", new Date(c.created_at).toLocaleDateString()])
  ], "customers.csv");

  const exportCollection = () => exportCSV([
    ["Loan ID","Amount","Source","Transaction Code","Date"],
    ...collectionPayments.map(p => [p.loan_id, p.amount, p.source, p.transaction_code||"", new Date(p.payment_date).toLocaleDateString()])
  ], \`collection-\${collectionDate}.csv\`);

  const exportIncome = () => exportCSV([
    ["ID","Loan ID","Customer","Amount","Type","Transaction Code","Date"],
    ...(income.income||[]).map((i: any) => [i.id, i.loan_id, i.customer_name||"", i.amount, i.type, i.transaction_code||"", new Date(i.created_at).toLocaleDateString()])
  ], "company-income.csv");

  const exportPAR = () => exportCSV([
    ["Loan ID","Customer","Amount","Balance","Expected","Collected","Arrears","Weeks"],
    ...parData.map(l => [l.id, l.customer_name, l.amount, l.balance, l.expectedByNow.toFixed(0), l.collected.toFixed(0), l.arrears.toFixed(0), l.weeksPassed])
  ], "par-report.csv");

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow px-4 md:px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-blue-600">Microfinance System</h1>
        <div className="flex gap-3 items-center flex-wrap">
          <button onClick={() => router.push("/customers")} className="text-gray-600 hover:text-blue-600 text-sm">Customers</button>
          <button onClick={() => router.push("/loans")} className="text-gray-600 hover:text-blue-600 text-sm">Loans</button>
          <button onClick={() => router.push("/payments")} className="text-gray-600 hover:text-blue-600 text-sm">Payments</button>
          {isAdmin && <button onClick={() => router.push("/approvals")} className="text-gray-600 hover:text-blue-600 text-sm relative">
            Approvals
            {pendingLoans > 0 && <span className="absolute -top-1 -right-2 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">{pendingLoans}</span>}
          </button>}
          {isAdmin && <button onClick={() => router.push("/matching")} className="text-gray-600 hover:text-blue-600 text-sm relative">
            Match
            {unmatched > 0 && <span className="absolute -top-1 -right-2 bg-orange-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">{unmatched}</span>}
          </button>}
          {isAdmin && <button onClick={() => router.push("/reports")} className="text-blue-600 font-semibold text-sm">Reports</button>}
          {userRole === "admin" && <button onClick={() => router.push("/settings")} className="text-gray-600 hover:text-blue-600 text-sm">⚙️</button>}
          <div className="flex items-center gap-2 ml-2 pl-2 border-l">
            <span className="text-sm text-gray-500">{userName}</span>
            <button onClick={logout} className="text-red-500 text-sm">Logout</button>
          </div>
        </div>
      </nav>

      <div className="p-4 md:p-6">
        <h2 className="text-2xl font-bold mb-6">Reports & Analytics</h2>

        {/* Quick Tools */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <button onClick={calculatePAR} className="bg-red-500 text-white p-4 rounded-lg hover:bg-red-600 text-left">
            <p className="font-bold text-sm">📊 PAR Report</p>
            <p className="text-xs opacity-80 mt-1">Portfolio at Risk</p>
          </button>
          <button onClick={() => { setShowCollection(true); setShowPar(false); setShowIncome(false); }} className="bg-green-600 text-white p-4 rounded-lg hover:bg-green-700 text-left">
            <p className="font-bold text-sm">📋 Collection Sheet</p>
            <p className="text-xs opacity-80 mt-1">Daily collections</p>
          </button>
          <button onClick={() => { setShowIncome(true); setShowPar(false); setShowCollection(false); }} className="bg-indigo-600 text-white p-4 rounded-lg hover:bg-indigo-700 text-left">
            <p className="font-bold text-sm">💰 Company Income</p>
            <p className="text-xs opacity-80 mt-1">KSh {totalIncome.toLocaleString()} fees</p>
          </button>
          {userRole === "admin" && <button onClick={() => router.push("/audit")} className="bg-purple-600 text-white p-4 rounded-lg hover:bg-purple-700 text-left">
            <p className="font-bold text-sm">📋 Audit Logs</p>
            <p className="text-xs opacity-80 mt-1">Activity trail</p>
          </button>}
          <button onClick={exportLoans} className="bg-orange-500 text-white p-4 rounded-lg hover:bg-orange-600 text-left">
            <p className="font-bold text-sm">⬇ Export Data</p>
            <p className="text-xs opacity-80 mt-1">Download CSV</p>
          </button>
        </div>

        {/* PAR Report */}
        {showPar && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-red-600">📊 Portfolio at Risk (PAR)</h3>
              <div className="flex gap-2">
                <button onClick={exportPAR} className="bg-red-500 text-white px-3 py-1 rounded text-sm">⬇ Export</button>
                <button onClick={() => setShowPar(false)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
            </div>
            {parData.length === 0 ? (
              <p className="text-green-600 font-medium">🎉 No loans in arrears! Portfolio is healthy.</p>
            ) : (
              <>
                <p className="text-sm text-red-600 mb-3">{parData.length} loan(s) behind — KSh {parData.reduce((s,l) => s + l.arrears, 0).toLocaleString()} in arrears</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[500px]">
                    <thead className="bg-gray-50">
                      <tr className="text-left text-gray-500 border-b">
                        <th className="p-3">Customer</th><th className="p-3">Loan</th>
                        <th className="p-3">Expected</th><th className="p-3">Collected</th>
                        <th className="p-3">Arrears</th><th className="p-3">Weeks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parData.map((l: any) => (
                        <tr key={l.id} className="border-b hover:bg-red-50">
                          <td className="p-3 font-medium">{l.customer_name}</td>
                          <td className="p-3">#{l.id} — KSh {parseFloat(l.amount).toLocaleString()}</td>
                          <td className="p-3">KSh {parseFloat(l.expectedByNow).toLocaleString()}</td>
                          <td className="p-3 text-green-600">KSh {parseFloat(l.collected).toLocaleString()}</td>
                          <td className="p-3 text-red-600 font-bold">KSh {parseFloat(l.arrears).toLocaleString()}</td>
                          <td className="p-3">{l.weeksPassed} wks</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* Collection Sheet */}
        {showCollection && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-green-600">📋 Collection Sheet</h3>
              <button onClick={() => setShowCollection(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="flex gap-3 items-center mb-4 flex-wrap">
              <input type="date" value={collectionDate} onChange={e => setCollectionDate(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm" />
              <button onClick={exportCollection} className="bg-green-600 text-white px-3 py-2 rounded text-sm">⬇ Export CSV</button>
            </div>
            {collectionPayments.length === 0 ? (
              <p className="text-gray-400">No payments on {collectionDate}</p>
            ) : (
              <>
                <p className="text-sm text-green-700 mb-3 font-medium">
                  {collectionPayments.length} payments — KSh {collectionPayments.reduce((s,p) => s + parseFloat(p.amount||0), 0).toLocaleString()} collected
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[400px]">
                    <thead className="bg-gray-50">
                      <tr className="text-left text-gray-500 border-b">
                        <th className="p-3">Loan ID</th><th className="p-3">Amount</th>
                        <th className="p-3">Source</th><th className="p-3">Code</th><th className="p-3">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {collectionPayments.map((p: any) => (
                        <tr key={p.id} className="border-b hover:bg-gray-50">
                          <td className="p-3">#{p.loan_id}</td>
                          <td className="p-3 text-green-600 font-bold">KSh {parseFloat(p.amount).toLocaleString()}</td>
                          <td className="p-3"><span className="px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-700">{p.source}</span></td>
                          <td className="p-3 font-mono text-xs">{p.transaction_code || "—"}</td>
                          <td className="p-3 text-gray-400">{new Date(p.payment_date).toLocaleTimeString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* Company Income */}
        {showIncome && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-indigo-600">💰 Company Income — Processing Fees</h3>
              <div className="flex gap-2">
                <button onClick={exportIncome} className="bg-indigo-600 text-white px-3 py-1 rounded text-sm">⬇ Export</button>
                <button onClick={() => setShowIncome(false)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-indigo-50 rounded-lg p-4">
                <p className="text-sm text-gray-500">Total Income</p>
                <p className="text-2xl font-bold text-indigo-600">KSh {totalIncome.toLocaleString()}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-sm text-gray-500">Processing Fees</p>
                <p className="text-2xl font-bold text-green-600">{processingFeeCount}</p>
                <p className="text-xs text-gray-400 mt-1">Loans processed</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm text-gray-500">Avg per Loan</p>
                <p className="text-2xl font-bold text-blue-600">
                  KSh {processingFeeCount > 0 ? Math.round(totalIncome / processingFeeCount).toLocaleString() : 0}
                </p>
              </div>
            </div>
            {(income.income || []).length === 0 ? (
              <p className="text-gray-400 text-center py-4">No income recorded yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[400px]">
                  <thead className="bg-gray-50">
                    <tr className="text-left text-gray-500 border-b">
                      <th className="p-3">Loan</th><th className="p-3">Customer</th>
                      <th className="p-3">Amount</th><th className="p-3">Type</th>
                      <th className="p-3">Transaction</th><th className="p-3">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(income.income || []).map((i: any) => (
                      <tr key={i.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">#{i.loan_id}</td>
                        <td className="p-3 font-medium">{i.customer_name || "—"}</td>
                        <td className="p-3 text-green-600 font-bold">KSh {parseFloat(i.amount).toLocaleString()}</td>
                        <td className="p-3"><span className="px-2 py-1 rounded-full text-xs bg-indigo-100 text-indigo-700">{i.type}</span></td>
                        <td className="p-3 font-mono text-xs">{i.transaction_code || "—"}</td>
                        <td className="p-3 text-gray-400">{new Date(i.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-500 text-sm">Total Disbursed</p>
            <p className="text-2xl md:text-3xl font-bold text-purple-600">KSh {totalDisbursed.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-1">{activeLoans} active · {paidLoans} paid</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-500 text-sm">Total Repaid</p>
            <p className="text-2xl md:text-3xl font-bold text-green-600">KSh {totalRepaid.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-1">{collectionRate}% collection rate</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-500 text-sm">Outstanding</p>
            <p className="text-2xl md:text-3xl font-bold text-red-600">KSh {totalOutstanding.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-500 text-sm">Processing Fees</p>
            <p className="text-2xl md:text-3xl font-bold text-indigo-600">KSh {totalIncome.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-1">{processingFeeCount} fees collected</p>
          </div>
        </div>

        {/* Export Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="font-bold mb-1">📊 Loans Report</p>
            <p className="text-sm text-gray-500 mb-3">{loans.length} loans</p>
            <button onClick={exportLoans} className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 text-sm">⬇ Export CSV</button>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="font-bold mb-1">💳 Payments Report</p>
            <p className="text-sm text-gray-500 mb-3">{payments.length} payments</p>
            <button onClick={exportPayments} className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 text-sm">⬇ Export CSV</button>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="font-bold mb-1">👥 Customers Report</p>
            <p className="text-sm text-gray-500 mb-3">{customers.length} customers</p>
            <button onClick={exportCustomers} className="w-full bg-purple-600 text-white py-2 rounded hover:bg-purple-700 text-sm">⬇ Export CSV</button>
          </div>
        </div>

        {/* Recent Payments */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg">Recent Payments</h3>
            <button onClick={() => router.push("/payments")} className="text-blue-600 text-sm hover:underline">View all</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[400px]">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-2">Loan ID</th><th className="pb-2">Amount</th>
                  <th className="pb-2">Source</th><th className="pb-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentPayments.map((p: any) => (
                  <tr key={p.id} className="border-b hover:bg-gray-50">
                    <td className="py-2">#{p.loan_id}</td>
                    <td className="py-2 text-green-600 font-medium">KSh {parseFloat(p.amount).toLocaleString()}</td>
                    <td className="py-2">
                      <span className={\`px-2 py-1 rounded-full text-xs \${p.source === "kcb_paybill" ? "bg-purple-100 text-purple-700" : p.source === "cash" ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-600"}\`}>
                        {p.source}
                      </span>
                    </td>
                    <td className="py-2 text-gray-400">{new Date(p.payment_date).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}`;

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Reports page written successfully!');