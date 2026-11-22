"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getPayments, createPayment, getLoans } from "@/lib/api";
import Layout from "../components/Layout";

const API = process.env.NEXT_PUBLIC_API_URL || "https://loan-system-h794.onrender.com";

export default function PaymentsPage() {
  const router = useRouter();
  const [payments, setPayments] = useState<any[]>([]);
  const [loans, setLoans] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ loan_id:"", amount:"", transaction_code:"", source:"mpesa" });
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [userRole, setUserRole] = useState("");

  const getHeaders = () => ({ "Content-Type":"application/json", Authorization:"Bearer " + localStorage.getItem("token") });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    setUserRole(user.role || "");
    loadData();
  }, []);

  const loadData = async () => {
    const [p, l] = await Promise.all([getPayments(), getLoans()]);
    setPayments(Array.isArray(p) ? p : []);
    setLoans(Array.isArray(l) ? l : []);
  };

  const handleSubmit = async () => {
    if (!form.loan_id || !form.amount) return;
    setLoading(true);
    await createPayment(form);
    setForm({ loan_id:"", amount:"", transaction_code:"", source:"mpesa" });
    setShowForm(false);
    loadData();
    setLoading(false);
  };

  const isAdmin = ["super_admin","admin","branch_admin","cashier"].includes(userRole);
  const fmt = (n: number) => "KSh " + Math.round(n||0).toLocaleString();

  const totalCollected = payments.reduce((s,p) => s + parseFloat(p.amount||0), 0);
  const kcbCollected = payments.filter(p => p.source === "kcb_paybill").reduce((s,p) => s + parseFloat(p.amount||0), 0);
  const manualCollected = payments.filter(p => p.source !== "kcb_paybill").reduce((s,p) => s + parseFloat(p.amount||0), 0);
  const todayCollected = payments.filter(p => new Date(p.payment_date).toDateString() === new Date().toDateString()).reduce((s,p) => s + parseFloat(p.amount||0), 0);

  const sourceConfig: Record<string,{label:string,color:string,bg:string,border:string}> = {
    kcb_paybill: { label:"KCB Paybill", color:"#1565C0", bg:"#EAF2FB", border:"#BFDBFE" },
    mpesa: { label:"M-Pesa", color:"#059669", bg:"#D1FAE5", border:"#A7F3D0" },
    cash: { label:"Cash", color:"#D97706", bg:"#FEF3C7", border:"#FDE68A" },
    suspense: { label:"Suspense", color:"#7C3AED", bg:"#EDE9FE", border:"#C4B5FD" },
    manual: { label:"Manual", color:"#6B7280", bg:"#F3F4F6", border:"#E5E7EB" },
    recovery: { label:"Recovery", color:"#DC2626", bg:"#FEE2E2", border:"#FECACA" },
  };

  const filtered = payments.filter(p => {
    const matchSearch = !search ||
      String(p.loan_id).includes(search) ||
      p.transaction_code?.toLowerCase().includes(search.toLowerCase()) ||
      p.customer_name?.toLowerCase().includes(search.toLowerCase());
    const matchSource = sourceFilter === "all" || p.source === sourceFilter;
    return matchSearch && matchSource;
  });

  const loanName = (id: number) => {
    const loan = loans.find(l => l.id === id);
    return loan ? loan.customer_name : "Loan #" + id;
  };

  return (
    <Layout>
      <div className="p-4 md:p-6 max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-[#0B2545]">Payments</h1>
            <p className="text-xs text-gray-400 mt-0.5">{payments.length} total transactions</p>
          </div>
          {isAdmin && (
            <button onClick={() => setShowForm(!showForm)}
              className="bg-[#1565C0] hover:bg-[#0D47A1] text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
              + Record Payment
            </button>
          )}
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {[
            { label:"Total Collected", val:fmt(totalCollected), sub:payments.length+" transactions", color:"#059669", bg:"#D1FAE5", border:"#A7F3D0",
              icon:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>' },
            { label:"KCB Paybill", val:fmt(kcbCollected), sub:"Via Paybill 522522", color:"#1565C0", bg:"#EAF2FB", border:"#BFDBFE",
              icon:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1565C0" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>' },
            { label:"Manual/Cash", val:fmt(manualCollected), sub:"Non-paybill payments", color:"#D97706", bg:"#FEF3C7", border:"#FDE68A",
              icon:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>' },
            { label:"Collected Today", val:fmt(todayCollected), sub:new Date().toLocaleDateString("en-KE",{day:"numeric",month:"short"}), color:"#7C3AED", bg:"#EDE9FE", border:"#C4B5FD",
              icon:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' },
          ].map(k => (
            <div key={k.label} className="bg-white rounded-2xl p-4 border flex items-center gap-3 shadow-sm" style={{ borderColor: k.border }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: k.bg }}
                dangerouslySetInnerHTML={{ __html: k.icon }} />
              <div>
                <p className="text-xs text-gray-400">{k.label}</p>
                <p className="text-base font-bold" style={{ color: k.color }}>{k.val}</p>
                <p className="text-[10px] text-gray-400">{k.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Record Payment Form */}
        {showForm && (
          <div className="bg-white rounded-2xl border border-[#BFDBFE] p-5 mb-5">
            <h3 className="font-bold text-[#0B2545] mb-4">Record Manual Payment</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Loan</label>
                <select value={form.loan_id} onChange={e => setForm({...form, loan_id:e.target.value})}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1565C0]/30">
                  <option value="">Select loan...</option>
                  {loans.filter(l => l.status === "active").map(l => (
                    <option key={l.id} value={l.id}>#{l.id} - {l.customer_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Amount (KSh)</label>
                <input type="number" value={form.amount} onChange={e => setForm({...form, amount:e.target.value})}
                  placeholder="0.00" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1565C0]/30" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Transaction Code</label>
                <input type="text" value={form.transaction_code} onChange={e => setForm({...form, transaction_code:e.target.value})}
                  placeholder="e.g. QKL7XY123" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1565C0]/30" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Source</label>
                <select value={form.source} onChange={e => setForm({...form, source:e.target.value})}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1565C0]/30">
                  <option value="mpesa">M-Pesa</option>
                  <option value="cash">Cash</option>
                  <option value="kcb_paybill">KCB Paybill</option>
                  <option value="manual">Manual</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={handleSubmit} disabled={loading}
                className="bg-[#1565C0] hover:bg-[#0D47A1] text-white px-6 py-2 rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors">
                {loading ? "Recording..." : "Record Payment"}
              </button>
              <button onClick={() => setShowForm(false)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-2 rounded-xl text-sm font-semibold transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4 flex gap-3 flex-wrap items-center">
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by loan ID, customer, transaction code..."
            className="flex-1 min-w-48 px-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1565C0]/30" />
          <div className="flex gap-1 flex-wrap">
            {["all","kcb_paybill","mpesa","cash","manual","suspense"].map(s => (
              <button key={s} onClick={() => setSourceFilter(s)}
                className={"px-3 py-1.5 rounded-lg text-xs font-medium transition-colors " +
                  (sourceFilter === s ? "bg-[#1565C0] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200")}>
                {s === "all" ? "All" : s === "kcb_paybill" ? "KCB" : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Payments Table */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {["#","Date","Customer / Loan","Amount","Transaction Code","Source","Actions"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.slice().reverse().map((p: any) => {
                  const sc = sourceConfig[p.source] || sourceConfig.manual;
                  return (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-xs text-gray-400 font-mono">#{p.id}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {new Date(p.payment_date).toLocaleDateString("en-KE", { day:"numeric", month:"short", year:"numeric" })}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-800">{p.customer_name || loanName(p.loan_id)}</p>
                        <p className="text-xs text-gray-400">Loan #{p.loan_id}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-bold text-[#059669]">KSh {parseFloat(p.amount).toLocaleString()}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded">
                          {p.transaction_code || "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: sc.bg, color: sc.color }}>
                          {sc.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => router.push("/loans/" + p.loan_id)}
                          className="text-xs text-[#1565C0] hover:underline font-medium">
                          View Loan
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="text-center py-16 text-gray-400 text-sm">No payments found</div>
            )}
          </div>
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
            <p className="text-xs text-gray-500">Showing {filtered.length} of {payments.length} payments</p>
            <p className="text-xs font-semibold text-[#059669]">Total: {fmt(filtered.reduce((s,p) => s + parseFloat(p.amount||0), 0))}</p>
          </div>
        </div>

      </div>
    </Layout>
  );
}
