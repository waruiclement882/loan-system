"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Layout from "../components/Layout";

const API = process.env.NEXT_PUBLIC_API_URL || "https://loan-system-h794.onrender.com";

export default function ExpenseApprovalsPage() {
  const router = useRouter();
  const [pending, setPending] = useState<any[]>([]);
  const [approved, setApproved] = useState<any[]>([]);
  const [edits, setEdits] = useState<Record<number, { paid_to: string; reason: string }>>({});
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [role, setRole] = useState("");

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
  const auth = { Authorization: "Bearer " + token };
  const json = { ...auth, "Content-Type": "application/json" };

  useEffect(() => {
    if (!token) { router.push("/login"); return; }
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    setRole(user.role || "");
    load();
  }, []);

  const load = async () => {
    try {
      const p = await fetch(`${API}/api/vouchers/pending`, { headers: auth }).then(r => r.json());
      setPending(Array.isArray(p) ? p : []);
      const now = new Date();
      const a = await fetch(`${API}/api/expenses?month=${now.getMonth() + 1}&year=${now.getFullYear()}`, { headers: auth }).then(r => r.json());
      setApproved((a.expenses || []).filter((e: any) => e.status === "approved"));
    } catch {
      setMsg({ type: "err", text: "Failed to load expenses" });
    }
  };

  const setEdit = (id: number, field: "paid_to" | "reason", value: string) =>
    setEdits(prev => ({
      ...prev,
      [id]: { paid_to: prev[id]?.paid_to ?? "", reason: prev[id]?.reason ?? "", [field]: value },
    }));

  const saveDetails = async (e: any) => {
    const ed = edits[e.id];
    if (!ed) return true;
    const res = await fetch(`${API}/api/vouchers/${e.id}/details`, {
      method: "PATCH", headers: json,
      body: JSON.stringify({ paid_to: ed.paid_to, no_receipt_reason: ed.reason }),
    });
    const d = await res.json();
    if (d.error) { setMsg({ type: "err", text: d.error }); return false; }
    return true;
  };

  const approve = async (e: any) => {
    setBusy(e.id); setMsg(null);
    if (!(await saveDetails(e))) { setBusy(null); return; }
    const res = await fetch(`${API}/api/vouchers/${e.id}/approve`, { method: "PATCH", headers: json });
    const d = await res.json();
    setMsg(d.error ? { type: "err", text: d.error } : { type: "ok", text: `Approved. Voucher ${d.voucher_no} issued.` });
    setBusy(null); load();
  };

  const reject = async (e: any) => {
    const reason = prompt("Reason for rejecting this expense:");
    if (!reason) return;
    setBusy(e.id); setMsg(null);
    const res = await fetch(`${API}/api/vouchers/${e.id}/reject`, {
      method: "PATCH", headers: json, body: JSON.stringify({ reason }),
    });
    const d = await res.json();
    setMsg(d.error ? { type: "err", text: d.error } : { type: "ok", text: "Expense rejected." });
    setBusy(null); load();
  };

  const uploadReceipt = async (e: any, file: File) => {
    setBusy(e.id); setMsg(null);
    const fd = new FormData();
    fd.append("receipt", file);
    const res = await fetch(`${API}/api/vouchers/${e.id}/receipt`, { method: "POST", headers: auth, body: fd });
    const d = await res.json();
    setMsg(d.error ? { type: "err", text: d.error } : { type: "ok", text: "Receipt attached." });
    setBusy(null); load();
  };

  const canApprove = role === "admin" || role === "branch_admin";

  return (
    <Layout>
      <div className="p-4 md:p-6 max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold mb-1">Expense Approvals</h2>
        <p className="text-sm text-gray-500 mb-4">
          An approved expense gets a numbered payment voucher. Pending expenses are not counted in P&L until approved.
        </p>

        {msg && (
          <div className={"mb-4 p-3 rounded-lg text-sm " + (msg.type === "ok" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
            {msg.text}
          </div>
        )}

        {!canApprove && (
          <div className="mb-4 p-3 rounded-lg text-sm bg-yellow-50 text-yellow-800">Only an admin or branch admin can approve expenses.</div>
        )}

        <h3 className="font-semibold mb-2">Pending ({pending.length})</h3>
        {pending.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-center text-gray-400 mb-6">Nothing waiting for approval</div>
        ) : (
          <div className="space-y-3 mb-8">
            {pending.map((e: any) => (
              <div key={e.id} className="bg-white rounded-lg shadow p-4">
                <div className="flex justify-between flex-wrap gap-2">
                  <div>
                    <p className="font-medium">{e.category} · KSh {parseFloat(e.amount).toLocaleString()}</p>
                    <p className="text-sm text-gray-600">{e.description}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Recorded by {e.recorded_by_name || "-"} · {new Date(e.expense_date || e.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-xs">
                    {e.receipt_url
                      ? <a href={e.receipt_url} target="_blank" rel="noreferrer" className="text-blue-600 underline">View receipt</a>
                      : <span className="text-gray-400">No receipt</span>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                  <input placeholder="Paid to (name or business)"
                    value={edits[e.id]?.paid_to ?? e.paid_to ?? ""}
                    onChange={ev => setEdit(e.id, "paid_to", ev.target.value)}
                    className="border rounded-lg px-3 py-2 text-sm" />
                  <input placeholder="If no receipt, why? e.g. matatu fare, none issued"
                    value={edits[e.id]?.reason ?? e.no_receipt_reason ?? ""}
                    onChange={ev => setEdit(e.id, "reason", ev.target.value)}
                    className="border rounded-lg px-3 py-2 text-sm" />
                </div>

                <div className="flex gap-2 mt-3 flex-wrap items-center">
                  <label className="cursor-pointer px-3 py-1.5 bg-gray-100 rounded-lg text-xs hover:bg-gray-200">
                    📎 Attach receipt (optional)
                    <input type="file" accept="image/*,.pdf" className="hidden"
                      onChange={ev => { const f = ev.target.files?.[0]; if (f) uploadReceipt(e, f); }} />
                  </label>
                  {canApprove && (
                    <>
                      <button disabled={busy === e.id} onClick={() => approve(e)}
                        className="px-4 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50">
                        ✅ Approve
                      </button>
                      <button disabled={busy === e.id} onClick={() => reject(e)}
                        className="px-4 py-1.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50">
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <h3 className="font-semibold mb-2">Approved this month ({approved.length})</h3>
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead className="bg-gray-50">
              <tr className="text-left text-gray-500 border-b">
                <th className="p-3">Date</th><th className="p-3">Category</th><th className="p-3">Description</th>
                <th className="p-3">Amount</th><th className="p-3">Voucher</th>
              </tr>
            </thead>
            <tbody>
              {approved.length === 0 ? (
                <tr><td colSpan={5} className="p-6 text-center text-gray-400">No approved expenses this month</td></tr>
              ) : approved.map((e: any) => (
                <tr key={e.id} className="border-b">
                  <td className="p-3">{new Date(e.expense_date || e.created_at).toLocaleDateString()}</td>
                  <td className="p-3">{e.category}</td>
                  <td className="p-3">{e.description}</td>
                  <td className="p-3 font-medium">KSh {parseFloat(e.amount).toLocaleString()}</td>
                  <td className="p-3">
                    <button onClick={() => router.push("/voucher?id=" + e.id)} className="text-blue-600 underline text-xs">
                      View voucher
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}