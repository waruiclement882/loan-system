"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "https://loan-system-h794.onrender.com";

function VoucherView() {
  const router = useRouter();
  const params = useSearchParams();
  const id = params.get("id");
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    if (!id) { setError("No voucher selected"); return; }
    fetch(`${API}/api/vouchers/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => (d.error ? setError(d.error) : setData(d)))
      .catch(() => setError("Failed to load voucher"));
  }, [id]);

  const fmt = (n: any) => parseFloat(n || 0).toLocaleString();
  const dt = (d: any) => d ? new Date(d).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" }) : "-";

  if (error) return <div className="p-10 text-center text-red-600">{error}</div>;
  if (!data) return <div className="p-10 text-center text-gray-500">Loading voucher...</div>;

  const v = data.voucher;
  const co = data.company;

  return (
    <div className="min-h-screen bg-gray-100 p-4 print:bg-white print:p-0">
      <div className="max-w-2xl mx-auto mb-3 flex gap-2 print:hidden">
        <button onClick={() => router.back()} className="px-4 py-2 bg-white border rounded-lg text-sm">← Back</button>
        <button onClick={() => window.print()} className="px-4 py-2 bg-green-700 text-white rounded-lg text-sm">🖨 Print / Save as PDF</button>
      </div>

      <div className="max-w-2xl mx-auto bg-white border p-8 print:border-0">
        <div className="text-center border-b pb-4 mb-4">
          <h1 className="text-xl font-bold text-green-900">{co.company_name || "Blessed Ventures LTD"}</h1>
          {co.address && <p className="text-xs text-gray-500">{co.address}</p>}
          <p className="text-xs text-gray-500">{[co.phone, co.email].filter(Boolean).join("  |  ")}</p>
          <h2 className="text-lg font-bold mt-3 tracking-wide">PAYMENT VOUCHER</h2>
        </div>

        <div className="flex justify-between text-sm mb-4">
          <p>Voucher No: <strong>{v.voucher_no}</strong></p>
          <p>Date: <strong>{dt(v.expense_date)}</strong></p>
        </div>

        <table className="w-full text-sm mb-4">
          <tbody>
            <tr className="border-b"><td className="py-2 text-gray-500 w-40">Paid to</td><td className="py-2 font-medium">{v.paid_to || "Not stated"}</td></tr>
            <tr className="border-b"><td className="py-2 text-gray-500">Category</td><td className="py-2">{v.category}</td></tr>
            <tr className="border-b"><td className="py-2 text-gray-500">Purpose</td><td className="py-2">{v.description}</td></tr>
            <tr className="border-b"><td className="py-2 text-gray-500">Payment method</td><td className="py-2">{v.payment_method}{v.reference ? ` (Ref: ${v.reference})` : ""}</td></tr>
            <tr className="border-b bg-green-50"><td className="py-3 text-gray-500">Amount</td><td className="py-3 text-lg font-bold">KSh {fmt(v.amount)}</td></tr>
          </tbody>
        </table>

        <div className="text-sm mb-4 p-3 bg-gray-50 rounded">
          <p className="font-medium mb-1">Supporting document</p>
          {v.receipt_url ? (
            <a href={v.receipt_url} target="_blank" rel="noreferrer" className="text-blue-600 underline">Receipt attached - view</a>
          ) : (
            <p className="text-gray-600">No third-party receipt. Reason: {v.no_receipt_reason || "not stated"}</p>
          )}
        </div>

        <div className="text-sm space-y-1 mb-8">
          <p>Recorded by: <strong>{v.recorded_by_name || "-"}</strong> on {dt(v.created_at)}</p>
          {v.approved_by_name ? (
            <p>Approved by: <strong>{v.approved_by_name}</strong> on {dt(v.approved_at)}</p>
          ) : (
            <p className="text-orange-600">Approved before the approval workflow was introduced (legacy record).</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-8 text-xs text-gray-500 mt-10">
          <div className="border-t pt-1">Received by (name & signature)</div>
          <div className="border-t pt-1">Approved by (signature)</div>
        </div>
        <p className="text-center text-[10px] text-gray-400 mt-6">System-generated voucher. Reference {v.voucher_no}.</p>
      </div>
    </div>
  );
}

export default function VoucherPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Loading...</div>}>
      <VoucherView />
    </Suspense>
  );
}