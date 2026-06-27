"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Layout from "../components/Layout";

const API = "https://loan-system-h794.onrender.com";

export default function CollectionPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";

  useEffect(() => {
    if (!token) { router.push("/login"); return; }
    loadSheet(date);
  }, []);

  const loadSheet = async (d: string) => {
    setLoading(true);
    const res = await fetch(API + "/api/reports/collection?date=" + d, { headers: { Authorization: "Bearer " + token } });
    const result = await res.json();
    setData(result);
    setLoading(false);
  };

  return (
    <Layout>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6 print:hidden">
          <h2 className="text-2xl font-bold text-[#04342C]">Daily Collection Sheet</h2>
          <div className="flex gap-3">
            <input type="date" value={date} onChange={e => { setDate(e.target.value); loadSheet(e.target.value); }}
              className="border rounded-lg px-3 py-2 text-sm" />
            <button onClick={() => window.print()} className="bg-[#0F6E56] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#085041]">Print</button>
          </div>
        </div>

        {loading ? <p className="text-center text-gray-400 py-12">Loading...</p> : data && (
          <>
            <div className="grid grid-cols-3 gap-4 mb-6 print:hidden">
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-sm text-gray-500">Due Today</p>
                <p className="text-2xl font-bold text-[#0F6E56]">{data.total} installments</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-sm text-gray-500">Collected</p>
                <p className="text-2xl font-bold text-green-600">KSh {parseFloat(data.collected).toLocaleString()}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-sm text-gray-500">Pending</p>
                <p className="text-2xl font-bold text-red-600">KSh {parseFloat(data.pending).toLocaleString()}</p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b flex justify-between">
                <h3 className="font-bold">Collection Sheet — {new Date(data.date).toLocaleDateString('en-KE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3>
              </div>
              {data.installments.length === 0 ? (
                <p className="p-8 text-center text-gray-400">No installments due on this date</p>
              ) : (
                <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr className="text-left text-gray-500">
                      <th className="px-6 py-3">#</th>
                      <th className="px-6 py-3">Customer</th>
                      <th className="px-6 py-3">Phone</th>
                      <th className="px-6 py-3">Loan ID</th>
                      <th className="px-6 py-3">Amount Due</th>
                      <th className="px-6 py-3">Amount Paid</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3 print:block">Signature</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.installments.map((inst: any, i: number) => (
                      <tr key={inst.id} className={"border-b " + (inst.status === "paid" ? "bg-green-50" : inst.status === "overdue" ? "bg-red-50" : "")}>
                        <td className="px-6 py-3 text-gray-400">{i + 1}</td>
                        <td className="px-6 py-3 font-medium">{inst.customer_name}</td>
                        <td className="px-6 py-3">{inst.phone}</td>
                        <td className="px-6 py-3">#{inst.loan_id}</td>
                        <td className="px-6 py-3 font-medium">KSh {parseFloat(inst.amount_due).toLocaleString()}</td>
                        <td className="px-6 py-3 text-green-600">{parseFloat(inst.amount_paid) > 0 ? "KSh " + parseFloat(inst.amount_paid).toLocaleString() : "-"}</td>
                        <td className="px-6 py-3">
                          <span className={"px-2 py-1 rounded-full text-xs " + (inst.status === "paid" ? "bg-green-100 text-green-700" : inst.status === "overdue" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700")}>
                            {inst.status}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-gray-200">___________</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t font-medium">
                    <tr>
                      <td colSpan={4} className="px-6 py-3">Total</td>
                      <td className="px-6 py-3">KSh {(parseFloat(data.collected) + parseFloat(data.pending)).toLocaleString()}</td>
                      <td className="px-6 py-3 text-green-600">KSh {parseFloat(data.collected).toLocaleString()}</td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
