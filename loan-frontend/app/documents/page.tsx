"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Layout from "../components/Layout";

const API = process.env.NEXT_PUBLIC_API_URL || "https://loan-system-h794.onrender.com";
const LABEL: Record<string, string> = {
  disbursement_voucher: "Disbursement voucher", loan_agreement: "Loan agreement",
  payment_receipt: "Payment receipt", fee_receipt: "Fee receipt",
};
const money = (n: any) => "KSh " + (parseFloat(n) || 0).toLocaleString("en-US", { maximumFractionDigits: 2 });
const fdate = (d: any) => (d ? new Date(d).toLocaleDateString("en-GB", { timeZone: "Africa/Nairobi", day: "numeric", month: "short", year: "numeric" }) : "-");
const EMPTY = { type: "", status: "", from: "", to: "", q: "" };
type Msg = { type: "ok" | "err"; text: string } | null;

export default function DocumentsPage() {
  const router = useRouter();
  const [role, setRole] = useState("");
  const [loanId, setLoanId] = useState("");
  const [bundle, setBundle] = useState<any>(null);
  const [msg, setMsg] = useState<Msg>(null);
  const [filters, setFilters] = useState({ ...EMPTY });
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
  const auth = { Authorization: "Bearer " + token };
  const json = { ...auth, "Content-Type": "application/json" };

  const loadRegister = async (pg: number, f: Record<string, string>) => {
    const p = new URLSearchParams();
    Object.entries({ ...f, page: String(pg) }).forEach(([k, v]) => { if (v) p.set(k, v); });
    const res = await fetch(`${API}/api/documents?` + p.toString(), { headers: auth });
    const d = await res.json();
    if (d.error) { setMsg({ type: "err", text: d.error }); return; }
    setRows(d.rows); setTotal(d.total); setPage(d.page); setPages(d.pages);
  };

  const loadLoan = async (id: string) => {
    setMsg(null); setBundle(null);
    if (!id) return;
    const res = await fetch(`${API}/api/documents/loan/${id}`, { headers: auth });
    const d = await res.json();
    if (d.error) setMsg({ type: "err", text: d.error }); else setBundle(d);
  };

  useEffect(() => {
    if (!token) { router.push("/login"); return; }
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (!["admin", "super_admin", "branch_admin", "cashier", "cfo"].includes(user.role)) { router.push("/dashboard"); return; }
    setRole(user.role);
    loadRegister(1, EMPTY);
    const pre = new URLSearchParams(window.location.search).get("loan");
    if (pre) { setLoanId(pre); loadLoan(pre); }
  }, []);

  const issue = async (body: any) => {
    setMsg(null);
    const res = await fetch(`${API}/api/documents/issue`, { method: "POST", headers: json, body: JSON.stringify(body) });
    const d = await res.json();
    if (d.error) { setMsg({ type: "err", text: d.error }); return; }
    router.push("/doc?id=" + d.doc.id);
  };

  const cancel = async (doc: any) => {
    const reason = prompt(`Reason for cancelling ${doc.doc_no}:`);
    if (!reason) return;
    const res = await fetch(`${API}/api/documents/${doc.id}/cancel`, { method: "POST", headers: json, body: JSON.stringify({ reason }) });
    const d = await res.json();
    setMsg(d.error ? { type: "err", text: d.error } : { type: "ok", text: d.message });
    loadRegister(page, filters); if (bundle) loadLoan(String(bundle.loan.id));
  };

  const live = (type: string, sourceId: number) =>
    bundle?.documents.find((x: any) => x.doc_type === type && x.source_id === sourceId && x.status === "issued");

  const Action = ({ doc, onIssue, label }: { doc: any; onIssue: () => void; label: string }) =>
    doc ? (
      <button onClick={() => router.push("/doc?id=" + doc.id)} className="px-3 py-1 bg-gray-100 rounded text-xs hover:bg-gray-200">Open {doc.doc_no}</button>
    ) : (
      <button onClick={onIssue} className="px-3 py-1 bg-green-700 text-white rounded text-xs hover:bg-green-800">{label}</button>
    );

  const canCancel = ["admin", "super_admin", "branch_admin"].includes(role);

  return (
    <Layout>
      <div className="p-4 md:p-6 max-w-6xl mx-auto">
        <h2 className="text-2xl font-bold">Documents</h2>
        <p className="text-sm text-gray-500 mb-4">Numbered, frozen copies of your vouchers, agreements and receipts. They cannot be edited or deleted. Cancel and reissue to correct one.</p>

        {msg && <div className={"mb-4 p-3 rounded-lg text-sm " + (msg.type === "ok" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>{msg.text}</div>}

        <div className="bg-white rounded-xl border border-[#D9E2DC] p-4 mb-6">
          <p className="font-medium mb-2">Documents for a loan</p>
          <div className="flex gap-2 flex-wrap">
            <input value={loanId} onChange={e => setLoanId(e.target.value)} onKeyDown={e => e.key === "Enter" && loadLoan(loanId)}
              placeholder="Loan number, e.g. 151" className="border rounded-lg px-3 py-2 text-sm w-56" />
            <button onClick={() => loadLoan(loanId)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Load</button>
          </div>

          {bundle && (
            <div className="mt-4">
              <p className="text-sm mb-3"><strong>Loan #{bundle.loan.id}</strong> · {bundle.loan.customer_name} · {money(bundle.loan.amount)} · {bundle.loan.status}</p>
              <div className="flex gap-2 flex-wrap mb-4">
                <Action doc={live("disbursement_voucher", bundle.loan.id)} label="Issue disbursement voucher" onIssue={() => issue({ type: "disbursement_voucher", loan_id: bundle.loan.id })} />
                <Action doc={live("loan_agreement", bundle.loan.id)} label="Issue loan agreement" onIssue={() => issue({ type: "loan_agreement", loan_id: bundle.loan.id })} />
              </div>

              <p className="text-sm font-medium mb-1">Payments received</p>
              <table className="w-full text-sm mb-4">
                <tbody>
                  {bundle.payments.length === 0 && <tr><td className="py-2 text-gray-400">No payments yet</td></tr>}
                  {bundle.payments.map((p: any) => (
                    <tr key={p.id} className="border-b">
                      <td className="py-1.5">{fdate(p.payment_date)}</td><td>{money(p.amount)}</td>
                      <td className="text-gray-500 text-xs">{p.source} {p.transaction_code || ""}</td>
                      <td className="text-right"><Action doc={live("payment_receipt", p.id)} label="Issue receipt" onIssue={() => issue({ type: "payment_receipt", payment_id: p.id })} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <p className="text-sm font-medium mb-1">Processing fees</p>
              <table className="w-full text-sm">
                <tbody>
                  {bundle.fees.length === 0 && <tr><td className="py-2 text-gray-400">No processing fee recorded</td></tr>}
                  {bundle.fees.map((f: any) => (
                    <tr key={f.id} className="border-b">
                      <td className="py-1.5">{fdate(f.created_at)}</td><td>{money(f.amount)}</td>
                      <td className="text-gray-500 text-xs">{f.transaction_code || ""}</td>
                      <td className="text-right"><Action doc={live("fee_receipt", f.id)} label="Issue fee receipt" onIssue={() => issue({ type: "fee_receipt", income_id: f.id })} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <h3 className="font-semibold mb-2">Register</h3>
        <div className="bg-white rounded-xl border border-[#D9E2DC] p-4 mb-3">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <select value={filters.type} onChange={e => setFilters({ ...filters, type: e.target.value })} className="border rounded-lg px-3 py-2 text-sm">
              <option value="">All types</option>
              {Object.entries(LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })} className="border rounded-lg px-3 py-2 text-sm">
              <option value="">Any status</option><option value="issued">Issued</option><option value="cancelled">Cancelled</option>
            </select>
            <input type="date" value={filters.from} onChange={e => setFilters({ ...filters, from: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
            <input type="date" value={filters.to} onChange={e => setFilters({ ...filters, to: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
            <input value={filters.q} placeholder="Number, customer or loan #" onChange={e => setFilters({ ...filters, q: e.target.value })}
              onKeyDown={e => e.key === "Enter" && loadRegister(1, filters)} className="border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={() => loadRegister(1, filters)} className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm">🔍 Search</button>
            <button onClick={() => { setFilters({ ...EMPTY }); loadRegister(1, EMPTY); }} className="px-4 py-2 bg-gray-100 rounded-lg text-sm">Clear</button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#D9E2DC] overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead className="bg-gray-50"><tr className="text-left text-gray-500 border-b">
              <th className="p-3">Number</th><th className="p-3">Type</th><th className="p-3">Customer</th><th className="p-3">Loan</th>
              <th className="p-3">Amount</th><th className="p-3">Issued</th><th className="p-3">Prints</th><th className="p-3">Status</th><th className="p-3"></th>
            </tr></thead>
            <tbody>
              {rows.length === 0 ? <tr><td colSpan={9} className="p-8 text-center text-gray-400">No documents yet</td></tr> :
                rows.map((r: any) => (
                  <tr key={r.id} className="border-b">
                    <td className="p-3 font-mono text-xs">{r.doc_no}</td><td className="p-3">{LABEL[r.doc_type] || r.doc_type}</td>
                    <td className="p-3">{r.customer_name}</td><td className="p-3">#{r.loan_id}</td>
                    <td className="p-3">{money(r.amount)}</td><td className="p-3">{fdate(r.issued_at)}</td><td className="p-3">{r.print_count}</td>
                    <td className="p-3"><span className={"px-2 py-0.5 rounded-full text-xs " + (r.status === "issued" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>{r.status}</span></td>
                    <td className="p-3 whitespace-nowrap">
                      <button onClick={() => router.push("/doc?id=" + r.id)} className="text-blue-600 text-xs underline mr-3">Open</button>
                      {canCancel && r.status === "issued" && <button onClick={() => cancel(r)} className="text-red-600 text-xs underline">Cancel</button>}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-between items-center mt-3 text-sm text-gray-500">
          <span>{total} documents · page {page} of {pages}</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => loadRegister(page - 1, filters)} className="px-3 py-1 bg-white border rounded-lg disabled:opacity-40">← Prev</button>
            <button disabled={page >= pages} onClick={() => loadRegister(page + 1, filters)} className="px-3 py-1 bg-white border rounded-lg disabled:opacity-40">Next →</button>
          </div>
        </div>
      </div>
    </Layout>
  );
}