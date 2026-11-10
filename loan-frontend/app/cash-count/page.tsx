"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Layout from "../components/Layout";

const API = process.env.NEXT_PUBLIC_API_URL || "https://loan-system-h794.onrender.com";
const num = (v: any) => parseFloat(v) || 0;
const fmt = (n: any) => num(n).toLocaleString(undefined, { maximumFractionDigits: 2 });
const eatDate = (d: any) => new Date(d).toLocaleDateString("en-KE", { timeZone: "Africa/Nairobi", day: "numeric", month: "short", year: "numeric" });

type Msg = { type: "ok" | "err"; text: string } | null;

export default function CashCountPage() {
  const router = useRouter();
  const [role, setRole] = useState("");
  const [tab, setTab] = useState<"count" | "drawings">("count");
  const [branches, setBranches] = useState<any[]>([]);
  const [branchId, setBranchId] = useState(1);
  const [exp, setExp] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [drawings, setDrawings] = useState<any[]>([]);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [form, setForm] = useState({ cash_on_hand: "", bank_balance: "", mpesa_balance: "", notes: "" });
  const [dform, setDform] = useState({ amount: "", purpose: "", payment_method: "cash", reference: "" });
  const [msg, setMsg] = useState<Msg>(null);
  const [busy, setBusy] = useState(false);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
  const auth = { Authorization: "Bearer " + token };
  const json = { ...auth, "Content-Type": "application/json" };
  const isAdmin = role === "admin";

  const loadCount = async () => {
    try {
      const e = await fetch(`${API}/api/cash/expected?branch_id=${branchId}`, { headers: auth }).then(r => r.json());
      if (!e.error) setExp(e);
      const h = await fetch(`${API}/api/cash/counts?branch_id=${branchId}`, { headers: auth }).then(r => r.json());
      setHistory(Array.isArray(h) ? h : []);
    } catch { setMsg({ type: "err", text: "Failed to load cash figures" }); }
  };

  const loadDrawings = async () => {
    try {
      const [y, m] = month.split("-");
      const d = await fetch(`${API}/api/cash/drawings?branch_id=${branchId}&month=${m}&year=${y}`, { headers: auth }).then(r => r.json());
      setDrawings(d.drawings || []);
    } catch { setMsg({ type: "err", text: "Failed to load drawings" }); }
  };

  useEffect(() => {
    if (!token) { router.push("/login"); return; }
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (!["admin", "branch_admin", "cashier"].includes(user.role)) { router.push("/dashboard"); return; }
    setRole(user.role);
    setBranchId(user.branch_id || 1);
    if (user.role === "admin") {
      fetch(`${API}/api/branches`, { headers: auth }).then(r => r.json()).then(b => { if (Array.isArray(b)) setBranches(b); }).catch(() => {});
    }
  }, []);
  useEffect(() => { if (role) loadCount(); }, [role, branchId]);
  useEffect(() => { if (role === "admin") loadDrawings(); }, [role, branchId, month]);

  const counted = num(form.cash_on_hand) + num(form.bank_balance) + num(form.mpesa_balance);
  const last = exp?.last;
  const variance = exp ? counted - num(exp.expected) : 0;
  const change = last ? variance - num(last.variance) : null;
  const needsNote = change !== null && Math.abs(change) >= 1;
  const canSubmit = !busy && counted > 0 && (!needsNote || form.notes.trim().length >= 5);

  const submitCount = async () => {
    setBusy(true); setMsg(null);
    const res = await fetch(`${API}/api/cash/count`, { method: "POST", headers: json, body: JSON.stringify({ branch_id: branchId, ...form }) });
    const d = await res.json();
    if (d.error) setMsg({ type: "err", text: d.error });
    else { setMsg({ type: "ok", text: d.message }); setForm({ cash_on_hand: "", bank_balance: "", mpesa_balance: "", notes: "" }); loadCount(); }
    setBusy(false);
  };

  const submitDrawing = async () => {
    setBusy(true); setMsg(null);
    const res = await fetch(`${API}/api/cash/drawings`, { method: "POST", headers: json, body: JSON.stringify({ branch_id: branchId, ...dform }) });
    const d = await res.json();
    if (d.error) setMsg({ type: "err", text: d.error });
    else { setMsg({ type: "ok", text: d.message }); setDform({ amount: "", purpose: "", payment_method: "cash", reference: "" }); loadDrawings(); loadCount(); }
    setBusy(false);
  };

  const statusOf = (r: any) => {
    if (r.variance_change == null) return { t: "Baseline", c: "bg-blue-100 text-blue-700" };
    const ch = num(r.variance_change);
    if (Math.abs(ch) < 1) return { t: "Balanced", c: "bg-green-100 text-green-700" };
    return ch < 0 ? { t: "Short " + fmt(Math.abs(ch)), c: "bg-red-100 text-red-700" } : { t: "Over " + fmt(ch), c: "bg-amber-100 text-amber-700" };
  };

  const line = (label: string, value: any, sign: string) => (
    <div className="flex justify-between py-1.5 border-b text-sm">
      <span className="text-gray-600">{label}</span><span className="font-medium">{sign} KSh {fmt(value)}</span>
    </div>
  );

  return (
    <Layout>
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        <div className="flex justify-between flex-wrap gap-3 mb-4">
          <div>
            <h2 className="text-2xl font-bold">Cash Count</h2>
            <p className="text-sm text-gray-500">Compare what the system expects with what you actually hold.</p>
          </div>
          {isAdmin && branches.length > 0 && (
            <select value={branchId} onChange={e => setBranchId(parseInt(e.target.value))} className="border rounded-lg px-3 py-2 text-sm">
              {branches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}
        </div>

        {isAdmin && (
          <div className="flex gap-2 mb-4">
            <button onClick={() => setTab("count")} className={"px-4 py-2 rounded-lg text-sm " + (tab === "count" ? "bg-green-700 text-white" : "bg-white border")}>Daily count</button>
            <button onClick={() => setTab("drawings")} className={"px-4 py-2 rounded-lg text-sm " + (tab === "drawings" ? "bg-green-700 text-white" : "bg-white border")}>Owner drawings</button>
          </div>
        )}

        {msg && <div className={"mb-4 p-3 rounded-lg text-sm " + (msg.type === "ok" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>{msg.text}</div>}

        {tab === "count" && (
          <>
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div className="bg-white rounded-xl border border-[#D9E2DC] p-5">
                <p className="text-xs text-gray-500">System expects</p>
                <p className="text-3xl font-bold text-green-800 mb-3">KSh {exp ? fmt(exp.expected) : "…"}</p>
                {exp && (<>
                  {line("Capital", exp.capital, "")}
                  {line("Loan repayments collected", exp.collections, "+")}
                  {line("Fees and other income", exp.income, "+")}
                  {line("Loans disbursed", exp.disbursed, "−")}
                  {line("Approved expenses", exp.expenses, "−")}
                  {line("Owner drawings", exp.drawings, "−")}
                </>)}
                <p className="text-xs text-gray-400 mt-3">Counts cash, bank and M-Pesa together.</p>
              </div>

              <div className="bg-white rounded-xl border border-[#D9E2DC] p-5">
                <p className="font-medium mb-3">What you hold now</p>
                {([["cash_on_hand", "Cash in hand"], ["bank_balance", "Bank balance (KCB / I&M)"], ["mpesa_balance", "M-Pesa balance"]] as [string, string][]).map(([k, l]) => (
                  <div key={k} className="mb-2">
                    <label className="text-xs text-gray-500">{l}</label>
                    <input type="number" min="0" value={(form as any)[k]} onChange={e => setForm({ ...form, [k]: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="0" />
                  </div>
                ))}
                <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm">
                  <div className="flex justify-between"><span>Counted total</span><strong>KSh {fmt(counted)}</strong></div>
                  <div className="flex justify-between"><span>Gap vs system</span>
                    <strong className={variance < 0 ? "text-red-600" : "text-green-700"}>{variance >= 0 ? "+" : "−"} KSh {fmt(Math.abs(variance))}</strong></div>
                  {change !== null && (
                    <div className="flex justify-between"><span>Change since last count</span>
                      <strong className={Math.abs(change) < 1 ? "text-green-700" : "text-red-600"}>{change >= 0 ? "+" : "−"} KSh {fmt(Math.abs(change))}</strong></div>
                  )}
                </div>
                {!last && <p className="text-xs text-blue-700 mt-2">This is your first count. It becomes the baseline, so any past gap is recorded rather than hidden. Later counts are judged by how much the gap moves.</p>}
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                  placeholder={needsNote ? "The gap moved. Explain why (required)" : "Notes (optional)"}
                  className={"w-full border rounded-lg px-3 py-2 text-sm mt-3 " + (needsNote ? "border-red-400" : "")} rows={2} />
                <button disabled={!canSubmit} onClick={submitCount}
                  className="w-full mt-3 py-2 bg-green-700 text-white rounded-lg text-sm hover:bg-green-800 disabled:opacity-50">
                  {busy ? "Saving..." : "Save count"}
                </button>
                <p className="text-xs text-gray-400 mt-2">Saved counts cannot be edited or deleted.</p>
              </div>
            </div>

            <h3 className="font-semibold mb-2">History</h3>
            <div className="bg-white rounded-xl border border-[#D9E2DC] overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead className="bg-gray-50"><tr className="text-left text-gray-500 border-b">
                  <th className="p-3">Date</th><th className="p-3">Expected</th><th className="p-3">Counted</th><th className="p-3">Gap</th><th className="p-3">Result</th><th className="p-3">By</th>
                </tr></thead>
                <tbody>
                  {history.length === 0 ? <tr><td colSpan={6} className="p-6 text-center text-gray-400">No counts yet</td></tr> :
                    history.map((h: any) => { const s = statusOf(h); return (
                      <tr key={h.id} className="border-b" title={h.notes || ""}>
                        <td className="p-3">{eatDate(h.created_at)}</td><td className="p-3">KSh {fmt(h.expected_cash)}</td>
                        <td className="p-3">KSh {fmt(h.counted_cash)}</td><td className="p-3">KSh {fmt(h.variance)}</td>
                        <td className="p-3"><span className={"px-2 py-0.5 rounded-full text-xs font-medium " + s.c}>{s.t}</span></td>
                        <td className="p-3 text-gray-500">{h.recorded_by_name || "—"}</td>
                      </tr>); })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === "drawings" && isAdmin && (
          <>
            <div className="bg-white rounded-xl border border-[#D9E2DC] p-5 mb-6">
              <p className="text-sm text-gray-500 mb-3">Money you take out for yourself. It is not an expense and does not reduce profit, but it does reduce the cash the system expects. Dated today.</p>
              <div className="grid md:grid-cols-2 gap-3">
                <input type="number" min="0" placeholder="Amount (KSh)" value={dform.amount} onChange={e => setDform({ ...dform, amount: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
                <select value={dform.payment_method} onChange={e => setDform({ ...dform, payment_method: e.target.value })} className="border rounded-lg px-3 py-2 text-sm">
                  <option value="cash">Cash</option><option value="mpesa">M-Pesa</option><option value="bank">Bank transfer</option>
                </select>
                <input placeholder="Purpose (required)" value={dform.purpose} onChange={e => setDform({ ...dform, purpose: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
                <input placeholder="Reference (optional)" value={dform.reference} onChange={e => setDform({ ...dform, reference: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
              </div>
              <button disabled={busy || !dform.amount || dform.purpose.trim().length < 3} onClick={submitDrawing}
                className="mt-3 px-5 py-2 bg-green-700 text-white rounded-lg text-sm hover:bg-green-800 disabled:opacity-50">Record drawing</button>
            </div>

            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold">Drawings this period</h3>
              <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="border rounded-lg px-3 py-1.5 text-sm" />
            </div>
            <div className="bg-white rounded-xl border border-[#D9E2DC] overflow-x-auto">
              <table className="w-full text-sm min-w-[500px]">
                <thead className="bg-gray-50"><tr className="text-left text-gray-500 border-b">
                  <th className="p-3">Date</th><th className="p-3">Amount</th><th className="p-3">Purpose</th><th className="p-3">Method</th><th className="p-3">By</th>
                </tr></thead>
                <tbody>
                  {drawings.length === 0 ? <tr><td colSpan={5} className="p-6 text-center text-gray-400">No drawings in this period</td></tr> :
                    drawings.map((d: any) => (
                      <tr key={d.id} className="border-b">
                        <td className="p-3">{eatDate(d.drawing_date)}</td><td className="p-3 font-medium">KSh {fmt(d.amount)}</td>
                        <td className="p-3">{d.purpose}</td><td className="p-3">{d.payment_method}</td><td className="p-3 text-gray-500">{d.recorded_by_name || "—"}</td>
                      </tr>))}
                </tbody>
                <tfoot><tr className="bg-gray-50 font-semibold"><td className="p-3">Total</td><td className="p-3" colSpan={4}>KSh {fmt(drawings.reduce((s, d) => s + num(d.amount), 0))}</td></tr></tfoot>
              </table>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}