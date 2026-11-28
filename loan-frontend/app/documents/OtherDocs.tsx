"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "https://loan-system-h794.onrender.com";
const money = (n: any) => "KSh " + (parseFloat(n) || 0).toLocaleString("en-US", { maximumFractionDigits: 2 });
const fdate = (d: any) => (d ? new Date(d).toLocaleDateString("en-GB", { timeZone: "Africa/Nairobi", day: "numeric", month: "short", year: "numeric" }) : "-");
const prevMonth = () => {
  const [y, m] = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Nairobi" }).split("-").map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
};

export default function OtherDocs() {
  const router = useRouter();
  const [s, setS] = useState<any>(null);
  const [msg, setMsg] = useState("");
  const [month, setMonth] = useState(prevMonth());
  const [branch, setBranch] = useState("1");
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
  const auth = { Authorization: "Bearer " + token };

  const load = async () => {
    try {
      const d = await fetch(`${API}/api/documents/sources`, { headers: auth }).then(r => r.json());
      if (!d.error) setS(d);
    } catch {}
  };
  useEffect(() => { load(); }, []);

  const issue = async (body: any) => {
    setMsg("");
    const res = await fetch(`${API}/api/documents/issue`, { method: "POST", headers: { ...auth, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await res.json();
    if (d.error) setMsg(d.error); else router.push("/doc?id=" + d.doc.id);
  };

  const Btn = ({ docId, body, label }: any) => docId
    ? <button onClick={() => router.push("/doc?id=" + docId)} className="px-3 py-1 bg-gray-100 rounded text-xs hover:bg-gray-200">Open</button>
    : <button onClick={() => issue(body)} className="px-3 py-1 bg-green-700 text-white rounded text-xs hover:bg-green-800">{label}</button>;

  const Group = ({ title, items, line }: any) => items && items.length > 0 ? (
    <div className="mb-4">
      <p className="text-sm font-medium mb-1">{title}</p>
      <table className="w-full text-sm"><tbody>
        {items.map((x: any) => (
          <tr key={x.id} className="border-b"><td className="py-1.5">{line(x)}</td><td className="text-right">{line(x, true)}</td></tr>
        ))}
      </tbody></table>
    </div>
  ) : null;

  if (!s) return null;
  return (
    <div className="bg-white rounded-xl border border-[#D9E2DC] p-4 mb-6">
      <p className="font-medium mb-2">Other records</p>
      {msg && <div className="mb-3 p-2 rounded bg-red-100 text-red-700 text-sm">{msg}</div>}

      <div className="mb-4 flex gap-2 flex-wrap items-center">
        <span className="text-sm font-medium">Month-end pack</span>
        <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="border rounded-lg px-3 py-1.5 text-sm" />
        {s.branches.length > 0 && (
          <select value={branch} onChange={e => setBranch(e.target.value)} className="border rounded-lg px-3 py-1.5 text-sm">
            {s.branches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        )}
        <button onClick={() => issue({ type: "month_end_pack", month, branch_id: branch })} className="px-3 py-1.5 bg-green-700 text-white rounded text-sm">Issue / open pack</button>
      </div>

      <Group title="Fully paid loans: clearance certificates" items={s.paid_loans}
        line={(x: any, act?: boolean) => act ? <Btn docId={x.doc_id} label="Issue certificate" body={{ type: "clearance_certificate", loan_id: x.id }} /> : `#${x.id} · ${x.name} · ${money(x.total_amount)}`} />
      <Group title="Written-off loans: memos" items={s.written_off}
        line={(x: any, act?: boolean) => act ? <Btn docId={x.doc_id} label="Issue memo" body={{ type: "write_off_memo", loan_id: x.id }} /> : `#${x.id} · ${x.name} · balance ${money(x.balance)}`} />
      <Group title="Cash counts: sheets" items={s.counts}
        line={(x: any, act?: boolean) => act ? <Btn docId={x.doc_id} label="Issue sheet" body={{ type: "cash_count_sheet", count_id: x.id }} /> : `${fdate(x.recon_date)} · counted ${money(x.counted_cash)} · gap ${money(x.variance)}`} />
      <Group title="Customer credit (suspense): slips" items={s.suspense}
        line={(x: any, act?: boolean) => act ? <Btn docId={x.doc_id} label="Issue slip" body={{ type: "suspense_slip", suspense_id: x.id }} /> : `#${x.id} · ${x.name || "-"} · ${x.type} ${money(x.amount)}`} />
      <Group title="Owner drawings: vouchers" items={s.drawings}
        line={(x: any, act?: boolean) => act ? <Btn docId={x.doc_id} label="Issue voucher" body={{ type: "drawing_voucher", drawing_id: x.id }} /> : `${fdate(x.drawing_date)} · ${money(x.amount)} · ${x.purpose}`} />
      <Group title="Capital: receipts" items={s.capital}
        line={(x: any, act?: boolean) => act ? <Btn docId={x.doc_id} label="Issue receipt" body={{ type: "capital_receipt", capital_id: x.id }} /> : `${fdate(x.movement_date)} · ${money(x.amount)} · ${x.description}`} />
    </div>
  );
}