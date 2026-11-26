"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Layout from "../../components/Layout";

const API = process.env.NEXT_PUBLIC_API_URL || "https://loan-system-h794.onrender.com";

export default function NewLoanPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<any[]>([]);
  const [pricing, setPricing] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{type:string,text:string}|null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomers, setShowCustomers] = useState(false);
  const [form, setForm] = useState({
    customer_id: "",
    customer_name: "",
    amount: "",
    term_weeks: "",
    interest_amount: "",
    total_amount: "",
    weekly_installment: "",
    processing_fee: "",
  });

  const getHeaders = () => ({ "Content-Type":"application/json", Authorization:"Bearer " + localStorage.getItem("token") });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (!["super_admin","admin","branch_admin","loan_officer"].includes(user.role)) {
      router.push("/loans"); return;
    }
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cRes, pRes] = await Promise.all([
        fetch(API + "/api/customers", { headers: getHeaders() }),
        fetch(API + "/api/pricing", { headers: getHeaders() }),
      ]);
      const [c, p] = await Promise.all([cRes.json(), pRes.json()]);
      setCustomers(Array.isArray(c) ? c : []);
      setPricing(Array.isArray(p) ? p : []);
    } catch {}
    setLoading(false);
  };

  const selectCustomer = (c: any) => {
    setForm({ ...form, customer_id: String(c.id), customer_name: c.name });
    setCustomerSearch(c.name);
    setShowCustomers(false);
  };

  const selectPricing = (p: any) => {
    setForm({
      ...form,
      amount: String(p.loan_amount),
      term_weeks: String(p.term_weeks),
      interest_amount: String(p.interest_amount),
      total_amount: String(p.total_amount),
      weekly_installment: String(p.weekly_installment),
    });
  };

  const filteredCustomers = customers.filter(c =>
    c.name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.phone?.includes(customerSearch)
  ).slice(0, 8);

  const fmt = (n: number) => "KSh " + Math.round(n||0).toLocaleString();

  const handleSubmit = async () => {
    if (!form.customer_id) { setMsg({ type:"error", text:"Please select a customer" }); return; }
    if (!form.amount) { setMsg({ type:"error", text:"Please select a loan product" }); return; }
    setSubmitting(true);
    try {
      const res = await fetch(API + "/api/loans", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          customer_id: parseInt(form.customer_id),
          amount: parseFloat(form.amount),
          term_weeks: parseInt(form.term_weeks),
          interest_amount: parseFloat(form.interest_amount),
          total_amount: parseFloat(form.total_amount),
          weekly_installment: parseFloat(form.weekly_installment),
          processing_fee: parseFloat(form.processing_fee || "0"),
        })
      });
      const data = await res.json();
      if (data.error) {
        setMsg({ type:"error", text:data.error });
      } else {
        setMsg({ type:"success", text:"Loan created successfully! Redirecting..." });
        setTimeout(() => router.push("/loans/" + data.id), 1500);
      }
    } catch {
      setMsg({ type:"error", text:"Failed to create loan. Please try again." });
    }
    setSubmitting(false);
  };

  return (
    <Layout>
      <div className="p-4 md:p-6 max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.push("/loans")}
            className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <div>
            <h1 className="text-xl font-bold text-[#0B2545]">New Loan Application</h1>
            <p className="text-xs text-gray-400 mt-0.5">Create a new loan for a customer</p>
          </div>
        </div>

        {/* Alert */}
        {msg && (
          <div className={"rounded-xl p-4 mb-5 text-sm font-medium " + (msg.type === "success" ? "bg-green-50 border border-green-200 text-green-800" : "bg-red-50 border border-red-200 text-red-800")}>
            {msg.text}
          </div>
        )}

        <div className="space-y-5">

          {/* Customer Selection */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-semibold text-[#0B2545] mb-4 flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[#EAF2FB] text-[#1565C0] flex items-center justify-center text-xs font-bold">1</div>
              Select Customer
            </h3>
            <div className="relative">
              <input value={customerSearch}
                onChange={e => { setCustomerSearch(e.target.value); setShowCustomers(true); setForm({...form, customer_id:"", customer_name:""}); }}
                onFocus={() => setShowCustomers(true)}
                placeholder="Search customer by name or phone..."
                className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1565C0]/30" />
              {showCustomers && customerSearch && filteredCustomers.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-gray-200 shadow-lg z-10 overflow-hidden">
                  {filteredCustomers.map(c => (
                    <button key={c.id} onClick={() => selectCustomer(c)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left transition-colors border-b border-gray-50 last:border-0">
                      <div className="w-8 h-8 rounded-full bg-[#EAF2FB] text-[#1565C0] flex items-center justify-center font-bold text-sm flex-shrink-0">
                        {c.name?.charAt(0)?.toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{c.name}</p>
                        <p className="text-xs text-gray-400">{c.phone || "No phone"}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {form.customer_id && (
              <div className="mt-3 flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                <p className="text-sm text-green-800 font-medium">{form.customer_name} selected</p>
              </div>
            )}
          </div>

          {/* Loan Product Selection */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-semibold text-[#0B2545] mb-4 flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[#EAF2FB] text-[#1565C0] flex items-center justify-center text-xs font-bold">2</div>
              Select Loan Product
            </h3>
            {pricing.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {pricing.map((p: any) => (
                  <button key={p.id} onClick={() => selectPricing(p)}
                    className={"w-full text-left p-4 rounded-xl border-2 transition-all " +
                      (form.amount === String(p.loan_amount) && form.term_weeks === String(p.term_weeks)
                        ? "border-[#1565C0] bg-[#EAF2FB]"
                        : "border-gray-200 hover:border-gray-300 bg-gray-50")}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-lg font-bold text-[#0B2545]">{fmt(p.loan_amount)}</p>
                      <span className="text-xs font-semibold bg-[#0B2545] text-white px-2 py-1 rounded-full">{p.term_weeks} wks</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                      <div><p className="text-gray-400">Weekly</p><p className="font-semibold text-gray-700">{fmt(p.weekly_installment)}</p></div>
                      <div><p className="text-gray-400">Total</p><p className="font-semibold text-gray-700">{fmt(p.total_amount)}</p></div>
                      <div><p className="text-gray-400">Interest</p><p className="font-semibold text-gray-700">{fmt(p.interest_amount)}</p></div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">No loan products configured. Add pricing rules in Settings.</p>
            )}
          </div>

          {/* Loan Summary */}
          {form.amount && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="font-semibold text-[#0B2545] mb-4 flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[#EAF2FB] text-[#1565C0] flex items-center justify-center text-xs font-bold">3</div>
                Loan Summary
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                {[
                  { label:"Principal", val:fmt(parseFloat(form.amount)) },
                  { label:"Interest", val:fmt(parseFloat(form.interest_amount)) },
                  { label:"Total Repayment", val:fmt(parseFloat(form.total_amount)) },
                  { label:"Term", val:form.term_weeks + " weeks" },
                  { label:"Weekly Payment", val:fmt(parseFloat(form.weekly_installment)) },
                ].map(item => (
                  <div key={item.label} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-400">{item.label}</p>
                    <p className="text-sm font-bold text-[#0B2545] mt-0.5">{item.val}</p>
                  </div>
                ))}
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Processing Fee (KSh) � Optional</label>
                <input type="number" value={form.processing_fee}
                  onChange={e => setForm({...form, processing_fee:e.target.value})}
                  placeholder="e.g. 700"
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1565C0]/30" />
              </div>
            </div>
          )}

          {/* Submit */}
          <div className="flex gap-3">
            <button onClick={() => router.push("/loans")}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl text-sm font-semibold transition-colors">
              Cancel
            </button>
            <button onClick={handleSubmit} disabled={submitting || !form.customer_id || !form.amount}
              className="flex-1 bg-[#1565C0] hover:bg-[#0D47A1] text-white py-3 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50">
              {submitting ? "Creating Loan..." : "Create Loan Application"}
            </button>
          </div>

        </div>
      </div>
    </Layout>
  );
}
