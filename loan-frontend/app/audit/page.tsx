"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Layout from "../components/Layout";

const API = process.env.NEXT_PUBLIC_API_URL || "https://loan-system-h794.onrender.com";

export default function AuditPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState("");

  const getHeaders = () => {
    const token = localStorage.getItem("token");
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  };

  const getDetailsText = (details: any): string => {
    if (!details) return "—";
    if (typeof details === "string") {
      try {
        const parsed = JSON.parse(details);
        return parsed.message || parsed.details || JSON.stringify(parsed);
      } catch {
        return details;
      }
    }
    if (typeof details === "object") {
      return details.message || details.details || JSON.stringify(details);
    }
    return String(details);
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (user.role !== "admin") { router.push("/dashboard"); return; }
    loadLogs();
  }, []);

  useEffect(() => {
    let result = logs;
    if (search) {
      result = result.filter(l =>
        l.user_name?.toLowerCase().includes(search.toLowerCase()) ||
        l.action?.toLowerCase().includes(search.toLowerCase()) ||
        getDetailsText(l.details).toLowerCase().includes(search.toLowerCase())
      );
    }
    if (filterAction) {
      result = result.filter(l => l.action === filterAction);
    }
    setFiltered(result);
  }, [search, filterAction, logs]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/audit`, { headers: getHeaders() });
      const data = await res.json();
      setLogs(Array.isArray(data) ? data : []);
      setFiltered(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Failed to load audit logs:", e);
    }
    setLoading(false);
  };

  const exportCSV = () => {
    const csv = [
      ["Time", "User", "Action", "Details", "Entity"].join(","),
      ...filtered.map(l => [
        new Date(l.created_at).toLocaleString(),
        l.user_name || "System",
        l.action,
        `"${getDetailsText(l.details)}"`,
        `${l.entity || ""} ${l.entity_id ? "#" + l.entity_id : ""}`
      ].join(","))
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "audit-logs.csv"; a.click();
  };

  const actionColor = (action: string) => {
    if (action?.includes("APPROVE") || action?.includes("DISBURSE")) return "bg-green-100 text-green-700";
    if (action?.includes("REJECT") || action?.includes("DELETE")) return "bg-red-100 text-red-700";
    if (action?.includes("CREATE")) return "bg-blue-100 text-blue-700";
    if (action?.includes("LOGIN")) return "bg-purple-100 text-purple-700";
    if (action?.includes("PAYMENT") || action?.includes("MATCH")) return "bg-orange-100 text-orange-700";
    return "bg-gray-100 text-gray-600";
  };

  const uniqueActions = [...new Set(logs.map(l => l.action))].filter(Boolean);

  return (
    <Layout>
      <div className="p-4 md:p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-[#04342C]">📋 Audit Logs</h2>
          <div className="flex gap-2">
            <button onClick={exportCSV} className="bg-[#0F6E56] text-white px-3 py-2 rounded-lg text-sm hover:bg-[#085041]">⬇ Export</button>
            <button onClick={loadLogs} className="bg-[#04342C] text-white px-3 py-2 rounded-lg text-sm hover:bg-[#085041]">🔄 Refresh</button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <div className="flex flex-col md:flex-row gap-3">
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by user, action, or details..."
              className="flex-1 border rounded-lg px-4 py-2 text-sm" />
            <select value={filterAction} onChange={e => setFilterAction(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm">
              <option value="">All Actions</option>
              {uniqueActions.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <button onClick={() => { setSearch(""); setFilterAction(""); }}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-200">
              Clear
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2">{filtered.length} of {logs.length} entries</p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading audit logs...</div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead className="bg-gray-50">
                <tr className="text-left text-gray-500 border-b">
                  <th className="p-4">Time</th>
                  <th className="p-4">User</th>
                  <th className="p-4">Action</th>
                  <th className="p-4">Details</th>
                  <th className="p-4">Entity</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-gray-400">No audit logs found</td></tr>
                ) : filtered.map((log: any) => (
                  <tr key={log.id} className="border-b hover:bg-gray-50">
                    <td className="p-4 text-gray-400 text-xs whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString("en-KE")}
                    </td>
                    <td className="p-4 font-medium">{log.user_name || "System"}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${actionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="p-4 text-gray-600 max-w-xs truncate">
                      {getDetailsText(log.details)}
                    </td>
                    <td className="p-4 text-gray-400 text-xs">
                      {log.entity} {log.entity_id ? `#${log.entity_id}` : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
