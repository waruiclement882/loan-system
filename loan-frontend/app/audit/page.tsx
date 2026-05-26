"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "https://loan-system-h794.onrender.com";

export default function AuditPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const getHeaders = () => {
    const token = localStorage.getItem("token");
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (user.role !== "admin") { router.push("/dashboard"); return; }
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      const res = await fetch(`${API}/api/audit`, { headers: getHeaders() });
      const data = await res.json();
      setLogs(Array.isArray(data) ? data : []);
    } catch {}
    setLoading(false);
  };

  const actionColor = (action: string) => {
    if (action.includes("APPROVE") || action.includes("DISBURSE")) return "bg-green-100 text-green-700";
    if (action.includes("REJECT") || action.includes("DELETE")) return "bg-red-100 text-red-700";
    if (action.includes("CREATE")) return "bg-blue-100 text-blue-700";
    if (action.includes("LOGIN")) return "bg-purple-100 text-purple-700";
    return "bg-gray-100 text-gray-600";
  };

  const filtered = logs.filter(l =>
    l.user_name?.toLowerCase().includes(search.toLowerCase()) ||
    l.action?.toLowerCase().includes(search.toLowerCase()) ||
    l.details?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-blue-600">Microfinance System</h1>
        <div className="flex gap-4">
          <button onClick={() => router.push("/dashboard")} className="text-gray-600 hover:text-blue-600">Dashboard</button>
          <button onClick={() => router.push("/settings")} className="text-gray-600 hover:text-blue-600">Settings</button>
          <button onClick={() => router.push("/users")} className="text-gray-600 hover:text-blue-600">Users</button>
          <button onClick={() => { localStorage.clear(); router.push("/login"); }} className="text-red-500 hover:text-red-700">Logout</button>
        </div>
      </nav>

      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">📋 Audit Logs</h2>
          <button onClick={loadLogs} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">🔄 Refresh</button>
        </div>

        <div className="mb-4">
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by user, action, or details..."
            className="w-full max-w-md border rounded-lg px-4 py-2 text-sm bg-white" />
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading audit logs...</div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full text-sm">
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
                    <td className="p-4 text-gray-600 max-w-xs truncate">{log.details || "—"}</td>
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
    </div>
  );
}