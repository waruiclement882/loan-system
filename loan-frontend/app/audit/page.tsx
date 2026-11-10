"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Layout from "../components/Layout";

const API = process.env.NEXT_PUBLIC_API_URL || "https://loan-system-h794.onrender.com";
const EMPTY = { from: "", to: "", user_id: "", category: "", risk: "", outcome: "", q: "" };
const CATS: [string, string][] = [["access", "Access & login"], ["loans", "Loans"], ["payments", "Payments"], ["funds", "Expenses & funds"], ["kyc", "KYC"], ["admin", "Administration"]];
const RISK: Record<string, string> = { high: "bg-red-100 text-red-700", medium: "bg-amber-100 text-amber-700", low: "bg-gray-100 text-gray-600" };
const eat = (d: any) => new Date(d).toLocaleString("en-KE", { timeZone: "Africa/Nairobi", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });
const dayAgo = (n: number) => new Date(Date.now() - n * 86400000).toLocaleDateString("en-CA", { timeZone: "Africa/Nairobi" });
const asObj = (v: any): any => { if (v == null) return null; if (typeof v === "object") return v; try { const o = JSON.parse(v); return typeof o === "object" ? o : null; } catch { return null; } };
const show = (v: any) => (v == null ? "—" : typeof v === "object" ? JSON.stringify(v) : String(v));

export default function AuditPage() {
  const router = useRouter();
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [summary, setSummary] = useState<any>(null);
  const [filters, setFilters] = useState({ ...EMPTY });
  const [applied, setApplied] = useState({ ...EMPTY });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<any>(null);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
  const auth = { Authorization: "Bearer " + token };

  const qs = (f: Record<string, any>, extra: Record<string, any> = {}) => {
    const p = new URLSearchParams();
    Object.entries({ ...f, ...extra }).forEach(([k, v]) => { if (v !== "" && v != null) p.set(k, String(v)); });
    return p.toString();
  };

  const load = async (pg: number, f: Record<string, any>) => {
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API}/api/audit?` + qs(f, { page: pg }), { headers: auth });
      const d = await res.json();
      if (!res.ok) { setError(d.error || "Failed to load the audit trail"); setRows([]); }
      else { setRows(d.rows); setTotal(d.total); setPages(d.pages); setPage(d.page); }
    } catch { setError("Failed to load the audit trail"); }
    setLoading(false);
  };

  useEffect(() => {
    if (!token) { router.push("/login"); return; }
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (!["admin", "branch_admin"].includes(user.role)) { router.push("/dashboard"); return; }
    fetch(`${API}/api/audit/summary`, { headers: auth }).then(r => r.json()).then(d => { if (!d.error) setSummary(d); }).catch(() => {});
    load(1, EMPTY);
  }, []);

  const apply = () => { setApplied(filters); load(1, filters); };
  const clear = () => { setFilters({ ...EMPTY }); setApplied({ ...EMPTY }); load(1, EMPTY); };
  const range = (days: number) => { const f = { ...filters, from: dayAgo(days), to: dayAgo(0) }; setFilters(f); setApplied(f); load(1, f); };

  const exportCsv = async () => {
    const res = await fetch(`${API}/api/audit/export?` + qs(applied), { headers: auth });
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error || "Export failed"); return; }
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement("a");
    a.href = url; a.download = "audit-trail-" + dayAgo(0) + ".csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const diff = (r: any) => {
    const o = asObj(r.old_values) || {}; const n = asObj(r.new_values) || {};
    return Array.from(new Set([...Object.keys(o), ...Object.keys(n)])).map(k => ({ k, before: o[k], after: n[k] }));
  };

  const card = (label: string, value: any, tone: string) => (
    <div className="bg-white rounded-xl border border-[#D9E2DC] p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={"text-2xl font-bold " + tone}>{value ?? "—"}</p>
    </div>
  );

  return (
    <Layout>
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <div className="flex justify-between items-start flex-wrap gap-3 mb-4">
          <div>
            <h2 className="text-2xl font-bold">Audit Trail</h2>
            <p className="text-sm text-gray-500">Who did what, when and from where. Entries are append-only; the database refuses edits and deletes. Times are East Africa Time.</p>
          </div>
          <button onClick={exportCsv} className="px-4 py-2 bg-green-700 text-white rounded-lg text-sm hover:bg-green-800">⬇ Export CSV</button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
          {card("Events today", summary?.today, "text-gray-800")}
          {card("Events, last 7 days", summary?.week, "text-gray-800")}
          {card("Active users, 7 days", summary?.users_week, "text-blue-700")}
          {card("High-risk, 30 days", summary?.high_30d, "text-red-600")}
          {card("Failed actions, 30 days", summary?.failures_30d, "text-amber-600")}
        </div>

        <div className="bg-white rounded-xl border border-[#D9E2DC] p-4 mb-4">
          <div className="flex gap-2 mb-3 flex-wrap items-center text-xs">
            <span className="text-gray-500">Quick range:</span>
            {[["Today", 0], ["7 days", 7], ["30 days", 30]].map(([l, d]) => (
              <button key={String(l)} onClick={() => range(d as number)} className="px-3 py-1 bg-gray-100 rounded-full hover:bg-gray-200">{l}</button>
            ))}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <input type="date" value={filters.from} onChange={e => setFilters({ ...filters, from: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
            <input type="date" value={filters.to} onChange={e => setFilters({ ...filters, to: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
            <select value={filters.user_id} onChange={e => setFilters({ ...filters, user_id: e.target.value })} className="border rounded-lg px-3 py-2 text-sm">
              <option value="">All users</option>
              {(summary?.users || []).map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <select value={filters.category} onChange={e => setFilters({ ...filters, category: e.target.value })} className="border rounded-lg px-3 py-2 text-sm">
              <option value="">All categories</option>
              {CATS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <select value={filters.risk} onChange={e => setFilters({ ...filters, risk: e.target.value })} className="border rounded-lg px-3 py-2 text-sm">
              <option value="">All risk levels</option>
              <option value="high">High risk only</option>
            </select>
            <select value={filters.outcome} onChange={e => setFilters({ ...filters, outcome: e.target.value })} className="border rounded-lg px-3 py-2 text-sm">
              <option value="">Any outcome</option>
              <option value="success">Success</option>
              <option value="failure">Failure</option>
            </select>
            <input value={filters.q} placeholder="Search user, action, details, #id"
              onChange={e => setFilters({ ...filters, q: e.target.value })}
              onKeyDown={e => e.key === "Enter" && apply()}
              className="border rounded-lg px-3 py-2 text-sm col-span-2" />
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={apply} className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">🔍 Search</button>
            <button onClick={clear} className="px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200">Clear</button>
          </div>
        </div>

        {error && <div className="mb-3 p-3 rounded-lg bg-red-100 text-red-700 text-sm">{error}</div>}

        <div className="bg-white rounded-xl border border-[#D9E2DC] overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead className="bg-gray-50">
              <tr className="text-left text-gray-500 border-b">
                <th className="p-3">Time</th><th className="p-3">User</th><th className="p-3">Action</th>
                <th className="p-3">Details</th><th className="p-3">Record</th><th className="p-3">Risk</th><th className="p-3">IP</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="p-8 text-center text-gray-400">Loading...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-gray-400">No entries match these filters</td></tr>
              ) : rows.map((r: any) => (
                <tr key={r.id} onClick={() => setSelected(r)} className="border-b hover:bg-gray-50 cursor-pointer">
                  <td className="p-3 text-xs text-gray-500 whitespace-nowrap">{eat(r.created_at)}</td>
                  <td className="p-3"><p className="font-medium">{r.user_name || "System"}</p><p className="text-xs text-gray-400">{r.user_role || ""}</p></td>
                  <td className="p-3"><span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 font-mono">{r.action}</span>
                    <p className="text-xs text-gray-400 mt-0.5">{r.category}</p></td>
                  <td className="p-3 text-gray-700 max-w-sm">{r.message || "—"}
                    {r.outcome === "failure" && <span className="ml-1 text-xs text-red-600">(failed)</span>}</td>
                  <td className="p-3 text-xs text-gray-500">{r.entity || ""}{r.entity_id ? " #" + r.entity_id : ""}</td>
                  <td className="p-3"><span className={"px-2 py-0.5 rounded-full text-xs font-medium " + RISK[r.risk]}>{r.risk}</span></td>
                  <td className="p-3 text-xs text-gray-400">{r.ip_address || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-between items-center mt-3 text-sm text-gray-500">
          <span>{total.toLocaleString()} entries · page {page} of {pages}</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => load(page - 1, applied)} className="px-3 py-1 bg-white border rounded-lg disabled:opacity-40">← Prev</button>
            <button disabled={page >= pages} onClick={() => load(page + 1, applied)} className="px-3 py-1 bg-white border rounded-lg disabled:opacity-40">Next →</button>
          </div>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-xl max-w-xl w-full max-h-[85vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between mb-3">
              <h3 className="font-bold">Entry #{selected.id}</h3>
              <button onClick={() => setSelected(null)} className="text-gray-400">✕</button>
            </div>
            <table className="w-full text-sm mb-4">
              <tbody>
                {[["When", eat(selected.created_at)], ["Who", `${selected.user_name || "System"} (${selected.user_role || "role not recorded"})`],
                  ["Action", selected.action], ["Category", selected.category], ["Risk", selected.risk],
                  ["Outcome", selected.outcome || "success"], ["Record", `${selected.entity || "—"} ${selected.entity_id ? "#" + selected.entity_id : ""}`],
                  ["IP address", selected.ip_address || "not recorded"], ["Summary", selected.message || "—"]].map(([k, v]) => (
                  <tr key={k} className="border-b"><td className="py-1.5 pr-3 text-gray-500 w-28">{k}</td><td className="py-1.5">{v}</td></tr>
                ))}
              </tbody>
            </table>
            {diff(selected).length > 0 ? (
              <>
                <p className="text-sm font-medium mb-1">Changes</p>
                <table className="w-full text-xs mb-4">
                  <thead><tr className="text-left text-gray-500"><th className="py-1">Field</th><th>Before</th><th>After</th></tr></thead>
                  <tbody>{diff(selected).map(d => (
                    <tr key={d.k} className="border-t"><td className="py-1 font-mono">{d.k}</td><td className="text-red-600">{show(d.before)}</td><td className="text-green-700">{show(d.after)}</td></tr>
                  ))}</tbody>
                </table>
              </>
            ) : <p className="text-xs text-gray-400 mb-4">No before/after values were recorded for this entry.</p>}
            <p className="text-sm font-medium mb-1">Raw details</p>
            <pre className="bg-gray-50 rounded p-3 text-xs overflow-x-auto whitespace-pre-wrap">{typeof selected.details === "object" ? JSON.stringify(selected.details, null, 2) : String(selected.details ?? "")}</pre>
          </div>
        </div>
      )}
    </Layout>
  );
}