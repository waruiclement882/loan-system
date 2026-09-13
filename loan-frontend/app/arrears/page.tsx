"use client";
import { useEffect, useState } from "react";
import Layout from "../components/Layout";

const API = process.env.NEXT_PUBLIC_API_URL || "https://loan-system-h794.onrender.com";

export default function ArrearsPage() {
  const [arrears, setArrears] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterOfficer, setFilterOfficer] = useState("");
  const [officers, setOfficers] = useState<string[]>([]);
  const [summary, setSummary] = useState({ totalArrears: 0, totalLoans: 0, totalAmount: 0 });

  const getHeaders = () => {
    const token = localStorage.getItem("token");
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  };

  useEffect(() => { loadArrears(); }, []);

  const loadArrears = async () => {
    setLoading(true);
    try {
      const [loansRes, usersRes] = await Promise.all([
        fetch(`${API}/api/loans`, { headers: getHeaders() }),
        fetch(`${API}/api/auth/users`, { headers: getHeaders() })
      ]);
      const loans = await loansRes.json();
      const users = await usersRes.json();

      // Build officer map
      const officerMap: Record<number, string> = {};
      if (Array.isArray(users)) {
        users.forEach((u: any) => { officerMap[u.id] = u.name; });
      }

      // Find overdue loans
      const today = new Date();
      const overdueLoans = Array.isArray(loans) ? loans.filter((l: any) => {
        if (l.status !== 'active') return false;
        const disbursed = new Date(l.disbursed_at || l.created_at);
        const weeksPassed = Math.floor((today.getTime() - disbursed.getTime()) / (7 * 24 * 60 * 60 * 1000));
        const weeklyAmount = parseFloat(l.total_amount) / parseInt(l.term_weeks);
        const expectedByNow = Math.min(weeksPassed * weeklyAmount, parseFloat(l.total_amount));
        const collected = parseFloat(l.total_amount) - parseFloat(l.balance);
        const arrearAmount = Math.max(0, expectedByNow - collected);
        return arrearAmount > 0;
      }).map((l: any) => {
        const disbursed = new Date(l.disbursed_at || l.created_at);
        const weeksPassed = Math.floor((today.getTime() - disbursed.getTime()) / (7 * 24 * 60 * 60 * 1000));
        const weeklyAmount = parseFloat(l.total_amount) / parseInt(l.term_weeks);
        const expectedByNow = Math.min(weeksPassed * weeklyAmount, parseFloat(l.total_amount));
        const collected = parseFloat(l.total_amount) - parseFloat(l.balance);
        const arrearAmount = Math.max(0, expectedByNow - collected);
        const daysOverdue = Math.floor((today.getTime() - disbursed.getTime()) / (1000 * 60 * 60 * 24));
        const officerName = officerMap[l.created_by] || 'Unknown';
        return { ...l, arrearAmount, weeksPassed, expectedByNow, collected, daysOverdue, officerName };
      }) : [];

      setArrears(overdueLoans);

      // Get unique officers
      const uniqueOfficers = [...new Set(overdueLoans.map((l: any) => l.officerName))];
      setOfficers(uniqueOfficers);

      // Summary
      setSummary({
        totalLoans: overdueLoans.length,
        totalArrears: overdueLoans.reduce((s: number, l: any) => s + l.arrearAmount, 0),
        totalAmount: overdueLoans.reduce((s: number, l: any) => s + parseFloat(l.balance), 0)
      });

    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const filtered = filterOfficer ? arrears.filter((l: any) => l.officerName === filterOfficer) : arrears;

  // Group by officer
  const byOfficer = filtered.reduce((acc: any, loan: any) => {
    if (!acc[loan.officerName]) acc[loan.officerName] = [];
    acc[loan.officerName].push(loan);
    return acc;
  }, {});

  const riskColor = (days: number) => {
    if (days > 40) return 'bg-red-100 text-red-700';
    if (days > 20) return 'bg-orange-100 text-orange-700';
    return 'bg-yellow-100 text-yellow-700';
  };

  const exportCSV = () => {
    const csv = [
      ['Loan ID', 'Customer', 'Officer', 'Amount', 'Balance', 'Expected', 'Arrears', 'Days Overdue', 'Risk'].join(','),
      ...filtered.map((l: any) => [
        l.id, l.customer_name, l.officerName, l.amount, l.balance,
        l.expectedByNow.toFixed(0), l.arrearAmount.toFixed(0), l.daysOverdue,
        l.daysOverdue > 40 ? 'HIGH' : l.daysOverdue > 20 ? 'MEDIUM' : 'LOW'
      ].join(','))
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'loan-arrears.csv'; a.click();
  };

  return (
    <Layout>
      <div className="p-4 md:p-6">
        <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">📋 Loan Arrears</h2>
            <p className="text-gray-500 text-sm mt-1">Overdue loans grouped by loan officer</p>
          </div>
          <div className="flex gap-2">
            <button onClick={loadArrears} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">🔄 Refresh</button>
            <button onClick={exportCSV} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700">⬇ Export CSV</button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
            <p className="text-gray-500 text-sm">Total Overdue Loans</p>
            <p className="text-3xl font-bold text-red-600">{summary.totalLoans}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-orange-500">
            <p className="text-gray-500 text-sm">Total Arrears Amount</p>
            <p className="text-3xl font-bold text-orange-600">KSh {summary.totalArrears.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
            <p className="text-gray-500 text-sm">Total Outstanding Balance</p>
            <p className="text-3xl font-bold text-yellow-600">KSh {summary.totalAmount.toLocaleString()}</p>
          </div>
        </div>

        {/* Filter by Officer */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex gap-3 flex-wrap items-center">
            <label className="text-sm font-medium text-gray-700">Filter by Officer:</label>
            <button onClick={() => setFilterOfficer("")}
              className={`px-3 py-1.5 rounded-lg text-sm ${!filterOfficer ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              All Officers ({arrears.length})
            </button>
            {officers.map(officer => (
              <button key={officer} onClick={() => setFilterOfficer(officer)}
                className={`px-3 py-1.5 rounded-lg text-sm ${filterOfficer === officer ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                {officer} ({arrears.filter((l: any) => l.officerName === officer).length})
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading arrears...</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-4xl mb-3">🎉</p>
            <p className="text-gray-500 font-medium">No loan arrears found!</p>
            <p className="text-gray-400 text-sm">All loans are on track</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(byOfficer).map(([officer, loans]: [string, any]) => {
              const officerArrears = loans.reduce((s: number, l: any) => s + l.arrearAmount, 0);
              const officerBalance = loans.reduce((s: number, l: any) => s + parseFloat(l.balance), 0);
              return (
                <div key={officer} className="bg-white rounded-lg shadow overflow-hidden">
                  {/* Officer Header */}
                  <div className="bg-gray-800 px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        {officer.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-white font-bold">{officer}</p>
                        <p className="text-gray-400 text-xs">{loans.length} overdue loan{loans.length > 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-red-400 font-bold">KSh {officerArrears.toLocaleString()} in arrears</p>
                      <p className="text-gray-400 text-xs">KSh {officerBalance.toLocaleString()} outstanding</p>
                    </div>
                  </div>

                  {/* Loans Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr className="text-left text-gray-500 border-b">
                          <th className="px-4 py-3">Loan</th>
                          <th className="px-4 py-3">Customer</th>
                          <th className="px-4 py-3">Loan Amount</th>
                          <th className="px-4 py-3">Balance</th>
                          <th className="px-4 py-3">Expected</th>
                          <th className="px-4 py-3">Arrears</th>
                          <th className="px-4 py-3">Days</th>
                          <th className="px-4 py-3">Risk</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loans.map((loan: any) => (
                          <tr key={loan.id} className="border-b hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium">#{loan.id}</td>
                            <td className="px-4 py-3">{loan.customer_name}</td>
                            <td className="px-4 py-3">KSh {parseFloat(loan.amount).toLocaleString()}</td>
                            <td className="px-4 py-3 text-red-600 font-medium">KSh {parseFloat(loan.balance).toLocaleString()}</td>
                            <td className="px-4 py-3 text-gray-600">KSh {loan.expectedByNow.toLocaleString()}</td>
                            <td className="px-4 py-3 text-orange-600 font-bold">KSh {loan.arrearAmount.toLocaleString()}</td>
                            <td className="px-4 py-3">{loan.daysOverdue} days</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${riskColor(loan.daysOverdue)}`}>
                                {loan.daysOverdue > 40 ? '🔴 HIGH' : loan.daysOverdue > 20 ? '🟠 MEDIUM' : '🟡 LOW'}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {/* Officer subtotal */}
                        <tr className="bg-gray-50 font-bold border-t-2">
                          <td className="px-4 py-3" colSpan={4}>Officer Total</td>
                          <td className="px-4 py-3"></td>
                          <td className="px-4 py-3 text-orange-600">KSh {officerArrears.toLocaleString()}</td>
                          <td className="px-4 py-3" colSpan={2}></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}