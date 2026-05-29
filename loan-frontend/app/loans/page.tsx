"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getLoans, createLoan, getCustomers, getPricingRules } from "@/lib/api";

export default function LoansPage() {
  const router = useRouter();
  const [loans, setLoans] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [pricingRules, setPricingRules] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ customer_id: "", amount: "", term_weeks: "", interest_amount: "", total_amount: "", weekly_installment: "" });
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) router.push("/login");
    loadData();
  }, []);

  const loadData = async () => {
    const [l, c, rules] = await Promise.all([getLoans(), getCustomers(), getPricingRules()]);
    setLoans(Array.isArray(l) ? l : []);
    setCustomers(Array.isArray(c) ? c : []);
    setPricingRules(Array.isArray(rules) ? rules : []);
  };

  const handleAmountOrTerm = (field: string, value: string) => {
    const updated = { ...form, [field]: value };
    const amount = field === "amount" ? value : form.amount;
    const term = field === "term_weeks" ? value : form.term_weeks;
    if (amount && term) {
      const match = pricingRules.find((r: any) => Number(r.loan_amount) === Number(amount) && Number(r.term_weeks) === Number(term));
      if (match) {
        updated.interest_amount = match.interest_amount;
        updated.total_amount = match.total_amount;
        updated.weekly_installment = match.weekly_installment;
      } else {
        updated.interest_amount = "";
        updated.total_amount = "";
        updated.weekly_installment = "";
      }
    }
    setForm(updated);
  };

  const handleSubmit = async () => {
    setLoading(true);
    await createLoan(form);
    setForm({ customer_id: "", amount: "", term_weeks: "", interest_amount: "", total_amount: "", weekly_installment: "" });
    setShowForm(false);
    loadData();
    setLoading(false);
  };

  const uniqueAmounts = [...new Set(pricingRules.map((r: any) => r.loan_amount))].sort((a: any, b: any) => a - b);
  const uniqueTerms = [...new Set(pricingRules.map((r: any) => r.term_weeks))].sort((a: any, b: any) => a - b);
  const totalDisbursed = loans.reduce((sum, l) => sum + parseFloat(l.amount || 0), 0);
  const totalOutstanding = loans.reduce((sum, l) => sum + parseFloat(l.balance || 0), 0);
  const paidLoans = loans.filter(l => l.status === "paid").length;
  const activeLoans = loans.filter(l => l.status === "active").length;

  // Filter loans by search and status
  const filtered = loans.filter((loan: any) => {
    const matchSearch = search === "" ||
      loan.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      loan.id?.toString().includes(search) ||
      loan.amount?.toString().includes(search) ||
      loan.status?.toLowerCase().includes(search.toLowerCase()) ||
      loan.created_by_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || loan.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const getBalanceColor = (balance: number, total: number) => {
    if (total === 0) return "text-gray-500";
    const percent = (balance / total) * 100;
    if (percent === 0) return "text-green-600";
    if (percent <= 50) return "text-yellow-600";
    return "text-red-600";
  };

  const getProgressWidth = (balance: number, total: number) => {
    if (total === 0) return 0;
    return Math.max(0, 100 - (balance / total) * 100);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-blue-600">Microfinance System</h1>
        <div className="flex gap-4">
          <button onClick={() => router.push("/dashboard")} className="text-gray-600 hover:text-blue-600">Dashboard</button>
          <button onClick={() => router.push("/customers")} className="text-gray-600 hover:text-blue-600">Customers</button>
          <button onClick={() => router.push("/payments")} className="text-gray-600 hover:text-blue-600">Payments</button>
          <button onClick={() => router.push("/approvals")} className="text-gray-600 hover:text-blue-600">Approvals</button>
          <button onClick={() => { localStorage.clear(); router.push("/login"); }} className="text-red-500 hover:text-red-700">Logout</button>
        </div>
      </nav>

      <div className="p-6">
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Total Loans</p>
            <p className="text-2xl font-bold text-blue-600">{loans.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Total Disbursed</p>
            <p className="text-2xl font-bold text-purple-600">KSh {totalDisbursed.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Outstanding Balance</p>
            <p className="text-2xl font-bold text-red-600">KSh {totalOutstanding.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Paid / Active</p>
            <p className="text-2xl font-bold text-green-600">{paidLoans} / {activeLoans}</p>
          </div>
        </div>

        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Loans</h2>
          <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">+ New Loan</button>
        </div>

        {/* Search and Filter */}
        <div className="flex gap-3 mb-4">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by customer, amount, status, officer..."
            className="flex-1 border rounded-lg px-4 py-2 text-sm"
          />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="border rounded-lg px-4 py-2 text-sm"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="active">Active</option>
            <option value="paid">Paid</option>
            <option value="rejected">Rejected</option>
          </select>
          {(search || statusFilter !== "all") && (
            <button onClick={() => { setSearch(""); setStatusFilter("all"); }}
              className="border rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">
              Clear
            </button>
          )}
        </div>

        {/* Results count */}
        {(search || statusFilter !== "all") && (
          <p className="text-sm text-gray-500 mb-3">
            Showing {filtered.length} of {loans.length} loans
          </p>
        )}

        {showForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="font-bold text-lg mb-4">New Loan</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
                <select value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })} className="w-full border rounded-lg px-3 py-2">
                  <option value="">Select customer</option>
                  {customers.map((c: any) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Loan Amount (KSh)</label>
                <select value={form.amount} onChange={(e) => handleAmountOrTerm("amount", e.target.value)} className="w-full border rounded-lg px-3 py-2">
                  <option value="">Select amount</option>
                  {uniqueAmounts.map((a: any) => (<option key={a} value={a}>KSh {Number(a).toLocaleString()}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Term (Weeks)</label>
                <select value={form.term_weeks} onChange={(e) => handleAmountOrTerm("term_weeks", e.target.value)} className="w-full border rounded-lg px-3 py-2">
                  <option value="">Select term</option>
                  {uniqueTerms.map((t: any) => (<option key={t} value={t}>{t} weeks</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Weekly Installment (KSh)</label>
                <input type="text" value={form.weekly_installment ? "KSh " + Number(form.weekly_installment).toLocaleString() : ""} readOnly className="w-full border rounded-lg px-3 py-2 bg-gray-50" placeholder="Auto-filled" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Interest (KSh)</label>
                <input type="text" value={form.interest_amount ? "KSh " + Number(form.interest_amount).toLocaleString() : ""} readOnly className="w-full border rounded-lg px-3 py-2 bg-gray-50" placeholder="Auto-filled" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Repayment (KSh)</label>
                <input type="text" value={form.total_amount ? "KSh " + Number(form.total_amount).toLocaleString() : ""} readOnly className="w-full border rounded-lg px-3 py-2 bg-gray-50" placeholder="Auto-filled" />
              </div>
            </div>
            {form.amount && form.term_weeks && !form.interest_amount && (
              <p className="mt-3 text-sm text-red-500">No pricing rule found for this combination.</p>
            )}
            {form.weekly_installment && (
              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-blue-800 text-sm font-medium">Loan Summary</p>
                <div className="grid grid-cols-3 gap-3 mt-2 text-sm">
                  <div><span className="text-gray-500">Weekly:</span> <span className="font-bold">KSh {Number(form.weekly_installment).toLocaleString()}</span></div>
                  <div><span className="text-gray-500">Total Interest:</span> <span className="font-bold">KSh {Number(form.interest_amount).toLocaleString()}</span></div>
                  <div><span className="text-gray-500">Total Repayment:</span> <span className="font-bold">KSh {Number(form.total_amount).toLocaleString()}</span></div>
                </div>
              </div>
            )}
            <div className="flex gap-3 mt-4">
              <button onClick={handleSubmit} disabled={loading || !form.customer_id || !form.amount || !form.term_weeks || !form.interest_amount}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50">
                {loading ? "Saving..." : "Create Loan"}
              </button>
              <button onClick={() => setShowForm(false)} className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-200">Cancel</button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b bg-gray-50">
                <th className="p-4">Customer</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Term</th>
                <th className="p-4">Weekly</th>
                <th className="p-4">Interest</th>
                <th className="p-4">Total</th>
                <th className="p-4">Balance</th>
                <th className="p-4">Progress</th>
                <th className="p-4">Status</th>
                <th className="p-4">Officer</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={10} className="p-4 text-center text-gray-400">
                  {search || statusFilter !== "all" ? "No loans match your search" : "No loans found"}
                </td></tr>
              ) : (
                filtered.map((loan: any) => {
                  const balance = parseFloat(loan.balance || 0);
                  const total = parseFloat(loan.total_amount || 0);
                  const progress = getProgressWidth(balance, total);
                  return (
                    <tr key={loan.id} className="border-b hover:bg-blue-50 cursor-pointer"
                      onClick={() => router.push("/loans/" + loan.id)}>
                      <td className="p-4 font-medium">{loan.customer_name}</td>
                      <td className="p-4">KSh {parseFloat(loan.amount).toLocaleString()}</td>
                      <td className="p-4">{loan.term_weeks} wks</td>
                      <td className="p-4">KSh {parseFloat(loan.weekly_installment || 0).toLocaleString()}</td>
                      <td className="p-4">KSh {parseFloat(loan.interest_amount || 0).toLocaleString()}</td>
                      <td className="p-4">KSh {parseFloat(loan.total_amount || 0).toLocaleString()}</td>
                      <td className={"p-4 font-medium " + getBalanceColor(balance, total)}>KSh {balance.toLocaleString()}</td>
                      <td className="p-4 w-32">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-green-500 h-2 rounded-full" style={{ width: progress + "%" }} />
                        </div>
                        <p className="text-xs text-gray-400 mt-1">{Math.round(progress)}% paid</p>
                      </td>
                      <td className="p-4">
                        <span className={"px-2 py-1 rounded-full text-xs font-medium " + (loan.status === "paid" ? "bg-green-100 text-green-700" : loan.status === "active" ? "bg-blue-100 text-blue-700" : loan.status === "approved" ? "bg-indigo-100 text-indigo-700" : loan.status === "rejected" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700")}>
                          {loan.status}
                        </span>
                      </td>
                      <td className="p-4 text-gray-500 text-xs">{loan.created_by_name || "-"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}