"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getLoans, createLoan, getCustomers, getPricingRules } from "@/lib/api";

export default function LoansPage() {
  const router = useRouter();
  const [loans, setLoans] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [pricingRules, setPricingRules] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    customer_id: "",
    amount: "",
    term_weeks: "",
    interest_amount: "",
    total_amount: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) router.push("/login");
    loadData();
  }, []);

  const loadData = async () => {
    const l = await getLoans();
    const c = await getCustomers();
    const rules = await getPricingRules();
    setLoans(Array.isArray(l) ? l : []);
    setCustomers(Array.isArray(c) ? c : []);
    setPricingRules(Array.isArray(rules) ? rules : []);
  };

  const handleAmountOrTerm = (field: string, value: string) => {
    const updated = { ...form, [field]: value };
    const amount = field === "amount" ? value : form.amount;
    const term = field === "term_weeks" ? value : form.term_weeks;

    if (amount && term) {
      const match = pricingRules.find(
        (r: any) =>
          Number(r.loan_amount) === Number(amount) &&
          Number(r.term_weeks) === Number(term)
      );
      if (match) {
        updated.interest_amount = (match as any).interest_amount;
        updated.total_amount = (match as any).total_amount;
      } else {
        updated.interest_amount = "";
        updated.total_amount = "";
      }
    }
    setForm(updated);
  };

  const handleSubmit = async () => {
    setLoading(true);
    await createLoan(form);
    setForm({
      customer_id: "",
      amount: "",
      term_weeks: "",
      interest_amount: "",
      total_amount: "",
    });
    setShowForm(false);
    loadData();
    setLoading(false);
  };

  const uniqueAmounts = [...new Set(pricingRules.map((r: any) => r.loan_amount))].sort((a: any, b: any) => a - b);
  const uniqueTerms = [...new Set(pricingRules.map((r: any) => r.term_weeks))].sort((a: any, b: any) => a - b);

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-blue-600">Microfinance System</h1>
        <div className="flex gap-4">
          <button onClick={() => router.push("/dashboard")} className="text-gray-600 hover:text-blue-600">Dashboard</button>
          <button onClick={() => router.push("/customers")} className="text-gray-600 hover:text-blue-600">Customers</button>
          <button onClick={() => router.push("/payments")} className="text-gray-600 hover:text-blue-600">Payments</button>
        </div>
      </nav>

      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Loans</h2>
          <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            + New Loan
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="font-bold text-lg mb-4">New Loan</h3>
            <div className="grid grid-cols-2 gap-4">

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
                <select value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })} className="w-full border rounded-lg px-3 py-2">
                  <option value="">Select customer</option>
                  {customers.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Loan Amount (KSh)</label>
                <select value={form.amount} onChange={(e) => handleAmountOrTerm("amount", e.target.value)} className="w-full border rounded-lg px-3 py-2">
                  <option value="">Select amount</option>
                  {uniqueAmounts.map((a: any) => (
                    <option key={a} value={a}>KSh {Number(a).toLocaleString()}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Term (Weeks)</label>
                <select value={form.term_weeks} onChange={(e) => handleAmountOrTerm("term_weeks", e.target.value)} className="w-full border rounded-lg px-3 py-2">
                  <option value="">Select term</option>
                  {uniqueTerms.map((t: any) => (
                    <option key={t} value={t}>{t} weeks</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Interest Amount (KSh)</label>
                <input
                  type="text"
                  value={form.interest_amount ? `KSh ${Number(form.interest_amount).toLocaleString()}` : ""}
                  readOnly
                  className="w-full border rounded-lg px-3 py-2 bg-gray-50 text-gray-700"
                  placeholder="Auto-filled"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Repayment (KSh)</label>
                <input
                  type="text"
                  value={form.total_amount ? `KSh ${Number(form.total_amount).toLocaleString()}` : ""}
                  readOnly
                  className="w-full border rounded-lg px-3 py-2 bg-gray-50 text-gray-700"
                  placeholder="Auto-filled"
                />
              </div>

            </div>

            {form.amount && form.term_weeks && !form.interest_amount && (
              <p className="mt-3 text-sm text-red-500">⚠️ No pricing rule found for this combination.</p>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading || !form.customer_id || !form.amount || !form.term_weeks || !form.interest_amount}
              className="mt-4 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Saving..." : "Create Loan"}
            </button>
          </div>
        )}

        <div className="bg-white rounded-lg shadow">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="p-4">Customer</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Term</th>
                <th className="p-4">Interest</th>
                <th className="p-4">Total Repayment</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {loans.map((loan: any) => (
                <tr key={loan.id} className="border-b hover:bg-gray-50">
                  <td className="p-4 font-medium">{loan.customer_name}</td>
                  <td className="p-4">KSh {parseFloat(loan.amount).toLocaleString()}</td>
                  <td className="p-4">{loan.term_weeks} weeks</td>
                  <td className="p-4">KSh {parseFloat(loan.interest_amount).toLocaleString()}</td>
                  <td className="p-4">KSh {parseFloat(loan.total_amount).toLocaleString()}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${loan.status === "approved" ? "bg-green-100 text-green-700" : loan.status === "rejected" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>
                      {loan.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}