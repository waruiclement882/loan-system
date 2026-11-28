"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Layout from "../components/Layout";

const API = process.env.NEXT_PUBLIC_API_URL || "https://loan-system-h794.onrender.com";
const money = (n: any) => "KSh " + (parseFloat(n) || 0).toLocaleString("en-US", { maximumFractionDigits: 2 });
const fdate = (d: any) => (d ? new Date(d).toLocaleDateString("en-GB", { timeZone: "Africa/Nairobi", day: "numeric", month: "short", year: "numeric" }) : "-");
type Msg = { type: "ok" | "err"; text: string } | null;

export default function CapitalPage() {
  const router = useRouter();
  const [data, setData] = useState<any>({ movements: [], totals: [] });
  const [branches, setBranches] = useState<any[]>([]);
  const [role, setRole] = useState("");
  const [form, setForm] = useState({ branch_id: "1", kind: "contribution", amount: "", description: "", reference: "", movement_date: "" });
  const [msg, setMsg] = useState<Msg>(null);
  const [busy, setBusy] = useState(false);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
  const auth = { Authorization: "Bearer " + token };
  const json = { ...auth, "Content-Type": "application/json" };

  const load = async () => {
    const d = await fetch(`${API}/api/capital`, { headers: auth }).then(r => r.json()).catch(() => null);
    if (!d || d.error) { setMsg({ type: "err", text: (d && d.error) || "Failed to load" }); return; }
    setData(d);
  };

  useEffect(() => {
    if (!token) { router.push("/login"); return; }
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (!["admin", "cfo"].includes(user.role)) { router.push("/dashboard"); return; }
    setRole(user.role);
    load();
    fetch(`${API}/api/branches`, { headers: auth }).then(r => r.json()).then(b => { if (Array.isArray(b)) setBranches(b); }).catch(() => {});
  }, []);

  const record = async () => {
    setBusy(true); setMsg(null);
    const res = await fetch(`${API}/api/capital`, { method: "POST", headers: json, body: JSON.stringify(form) });
    const d = await res.json();
    if (d.error) setMsg({ type: "err", text: d.error });
    else { setMsg({ type: "ok", text: d.message }); setForm({ ...form, amount: "", description: "", reference: "", movement_date: "" }); load(); }
    setBusy(false);
  };

  const receipt = async (m: any) => {
    if (m.doc_id) { router.push("/doc?id=" + m.doc_id); return; }
    const res = await fetch(`${API}/api/documents/issue`, { method: "POST", headers: json, body: JSON.stringify({ type: "capital_receipt", capital_id: m.id }) });
    const d = await res.json();
    if (d.error) setMsg({ type: "err", text: d.error }); else router.push("/doc?id=" + d.doc.id);
  };

  const totalFor = (id: number) => (data.totals.find((t: any) => t.branch_id === id) || {}).total || 0;

  return (
    <Layout>
      <div className="p-4 md:p-6 max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold">Capital log</h2>
        <p className="text-sm text-gray-500 mb-4">Every shilling put into a branch, with a receipt. Entries are never edited or deleted. A mistake is corrected with an adjustment.</p>
        {msg && <div className={"mb-4 p-3 rounded-lg text-sm " + (msg.type === "ok" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>{msg.text}</div>}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {branches.map((b: any) => (
            <div key={b.id} className="bg-white rounded-xl border border-[#D9E2DC] p-4">
              <p className="text-xs text-gray-500">{b.name}</p>
              <p className="text-xl font-bold">{money(totalFor(b.id))}</p>
            </div>
          ))}
        </div>

        {role === "admin" && (
          <div className="bg-white rounded-xl border border-[#D9E2DC] p-4 mb-6">
            <p className="font-medium mb-2">Record capital <span className="text-xs text-gray-400">(super admin only)</span></p>
            <div className="grid md:grid-cols-3 gap-3">
              <select value={form.branch_id} onChange={e => setForm({ ...form, branch_id: e.target.value })} className="border rounded-lg px-3 py-2 text-sm">
                {branches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <select value={form.kind} onChange={e => setForm({ ...form, kind: e.target.value })} className="border rounded-lg px-3 py-2 text-sm">
                <option value="contribution">Contribution (money in)</option><option value="adjustment">Adjustment (correction, + or −)</option>
              </select>
              <input type="number" placeholder="Amount (KSh)" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
              <input placeholder="Where it came from / why" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="border rounded-lg px-3 py-2 text-sm md:col-span-2" />
              <input type="date" value={form.movement_date} onChange={e => setForm({ ...form, movement_date: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
              <input placeholder="Reference (optional)" value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} className="border rounded-lg px-3 py-2 text-sm md:col-span-3" />
            </div>
            <button disabled={busy || !form.amount || !form.description} onClick={record} className="mt-3 px-5 py-2 bg-green-700 text-white rounded-lg text-sm disabled:opacity-50">Record</button>
          </div>
        )}

        <div className="bg-white rounded-xl border border-[#D9E2DC] overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-gray-50"><tr className="text-left text-gray-500 border-b">
              <th className="p-3">Date</th><th className="p-3">Branch</th><th className="p-3">Type</th><th className="p-3">Amount</th><th className="p-3">Description</th><th className="p-3">By</th><th className="p-3"></th>
            </tr></thead>
            <tbody>
              {data.movements.length === 0 ? <tr><td colSpan={7} className="p-6 text-center text-gray-400">No entries</td></tr> :
                data.movements.map((m: any) => (
                  <tr key={m.id} className="border-b">
                    <td className="p-3">{fdate(m.movement_date)}</td><td className="p-3">{m.branch_name}</td><td className="p-3">{m.kind}</td>
                    <td className={"p-3 font-medium " + (parseFloat(m.amount) < 0 ? "text-red-600" : "")}>{money(m.amount)}</td>
                    <td className="p-3">{m.description}</td><td className="p-3 text-gray-500">{m.recorded_by_name || "-"}</td>
                    <td className="p-3">{m.kind !== "adjustment" && role === "admin" && (
                      <button onClick={() => receipt(m)} className="text-blue-600 text-xs underline">{m.doc_id ? "Open receipt" : "Issue receipt"}</button>)}</td>
                  </tr>))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}