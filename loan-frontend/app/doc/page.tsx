"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "https://loan-system-h794.onrender.com";
const money = (n: any) => "KSh " + (parseFloat(n) || 0).toLocaleString("en-US", { maximumFractionDigits: 2 });
const fdate = (d: any) => (d ? new Date(d).toLocaleDateString("en-GB", { timeZone: "Africa/Nairobi", day: "numeric", month: "short", year: "numeric" }) : "-");

const Row = ({ k, v }: { k: string; v: any }) => (
  <tr className="border-b"><td className="py-1.5 pr-3 text-gray-500 w-44 align-top">{k}</td><td className="py-1.5 font-medium">{v ?? "-"}</td></tr>
);
const Sign = ({ label }: { label: string }) => (
  <div className="border-t border-gray-400 pt-1 text-xs text-gray-500">{label}</div>
);
const Schedule = ({ rows }: { rows: any[] }) => (
  <table className="w-full text-sm my-3 border">
    <thead className="bg-gray-50"><tr className="text-left text-gray-600"><th className="p-2">No.</th><th className="p-2">Due date</th><th className="p-2 text-right">Amount</th></tr></thead>
    <tbody>
      {rows.map((s: any) => (
        <tr key={s.week_number} className="border-t"><td className="p-2">{s.week_number}</td><td className="p-2">{fdate(s.due_date)}</td><td className="p-2 text-right">{money(s.amount_due)}</td></tr>
      ))}
      <tr className="border-t bg-gray-50 font-semibold">
        <td className="p-2" colSpan={2}>Total</td>
        <td className="p-2 text-right">{money(rows.reduce((s: number, r: any) => s + (parseFloat(r.amount_due) || 0), 0))}</td>
      </tr>
    </tbody>
  </table>
);

function DocView() {
  const router = useRouter();
  const params = useSearchParams();
  const id = params.get("id");
  const [doc, setDoc] = useState<any>(null);
  const [err, setErr] = useState("");
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
  const auth = { Authorization: "Bearer " + token };

  useEffect(() => {
    if (!token) { router.push("/login"); return; }
    if (!id) { setErr("No document selected"); return; }
    fetch(`${API}/api/documents/${id}`, { headers: auth })
      .then(r => r.json())
      .then(d => (d.error ? setErr(d.error) : setDoc(d)))
      .catch(() => setErr("Failed to load document"));
  }, [id]);

  const print = async () => {
    if (doc.status === "issued") {
      await fetch(`${API}/api/documents/${id}/print`, { method: "POST", headers: auth }).catch(() => {});
    }
    window.print();
    setDoc({ ...doc, print_count: doc.print_count + (doc.status === "issued" ? 1 : 0) });
  };

  if (err) return <div className="p-10 text-center text-red-600">{err}</div>;
  if (!doc) return <div className="p-10 text-center text-gray-500">Loading document...</div>;

  const d = doc.data;
  const co = d.company || {};
  const unfinished = (d.terms || []).some((t: any) => t.placeholder);
  const t = doc.doc_type;

  return (
    <div className="min-h-screen bg-gray-100 p-4 print:bg-white print:p-0">
      <div className="max-w-3xl mx-auto mb-3 flex gap-2 flex-wrap print:hidden">
        <button onClick={() => router.back()} className="px-4 py-2 bg-white border rounded-lg text-sm">← Back</button>
        {doc.status === "issued" && <button onClick={print} className="px-4 py-2 bg-green-700 text-white rounded-lg text-sm">🖨 Print / Save as PDF</button>}
        <button onClick={() => router.push("/documents?loan=" + doc.loan_id)} className="px-4 py-2 bg-white border rounded-lg text-sm">All documents for loan #{doc.loan_id}</button>
      </div>
      {unfinished && (
        <div className="max-w-3xl mx-auto mb-3 p-3 bg-amber-100 text-amber-900 text-sm rounded-lg print:hidden">
          This agreement contains clauses marked [[TO BE COMPLETED]]. Have your lawyer finalise the wording before customers sign it.
        </div>
      )}

      <div className="max-w-3xl mx-auto bg-white border p-8 print:border-0 relative">
        {doc.status === "cancelled" && (
          <div className="mb-4 p-3 border-2 border-red-600 text-red-700 text-sm font-semibold">
            CANCELLED on {fdate(doc.cancelled_at)}: {doc.cancel_reason}
          </div>
        )}
        {doc.status === "issued" && doc.print_count > 0 && (
          <div className="absolute top-4 right-4 border-2 border-gray-500 text-gray-600 text-xs font-bold px-2 py-1 rotate-6">REPRINT</div>
        )}

        <div className="text-center border-b pb-4 mb-4">
          {co.logo_url && <img src={co.logo_url} alt="" className="h-14 mx-auto mb-2 object-contain" />}
          <h1 className="text-xl font-bold">{co.company_name || "Blessed Ventures LTD"}</h1>
          {co.address && <p className="text-xs text-gray-500">{co.address}</p>}
          <p className="text-xs text-gray-500">{[co.phone, co.email].filter(Boolean).join("  |  ")}</p>
          <h2 className="text-lg font-bold mt-3 tracking-wide uppercase">{doc.title}</h2>
        </div>

        <div className="flex justify-between text-sm mb-4">
          <p>No: <strong>{doc.doc_no}</strong></p>
          <p>Branch: <strong>{d.branch?.name}</strong></p>
          <p>Issued: <strong>{fdate(doc.issued_at)}</strong></p>
        </div>

        {(t === "disbursement_voucher" || t === "loan_agreement") && (
          <>
            <table className="w-full text-sm mb-3"><tbody>
              <Row k="Borrower" v={d.customer.name} />
              <Row k="Phone" v={d.customer.phone} />
              <Row k="National ID" v={d.customer.national_id} />
              <Row k="Loan number" v={"#" + d.loan.id} />
              <Row k="Amount advanced" v={`${money(d.loan.amount)}  (${d.amount_words})`} />
              <Row k="Interest" v={money(d.loan.interest_amount)} />
              <Row k="Total to repay" v={money(d.loan.total_amount)} />
              <Row k="Disbursed on" v={fdate(d.loan.disbursed_at)} />
              {t === "disbursement_voucher" && d.loan.processing_fee > 0 && <Row k="Processing fee (paid separately)" v={money(d.loan.processing_fee)} />}
            </tbody></table>

            {t === "loan_agreement" && (
              <div className="my-4 text-sm space-y-2">
                {d.terms.map((x: any) => (
                  <p key={x.n}><strong>{x.n}. {x.heading}.</strong> <span className={x.placeholder ? "bg-amber-100" : ""}>{x.text}</span></p>
                ))}
              </div>
            )}

            <p className="text-sm font-medium mt-4">Repayment schedule</p>
            <Schedule rows={d.schedule} />

            {t === "disbursement_voucher" && (
              <div className="text-sm p-3 bg-gray-50 rounded mb-4">
                <p className="font-medium mb-1">How to repay</p>
                <p>Paybill <strong>{d.pay.paybill}</strong>, account <strong>{d.pay.account_number}</strong>. Keep each confirmation message.</p>
              </div>
            )}

            <div className="grid grid-cols-3 gap-6 mt-12">
              {t === "disbursement_voucher" ? (
                <>
                  <div><p className="text-xs mb-6">{d.prepared_by || doc.issued_by_name}</p><Sign label="Prepared by" /></div>
                  <div><p className="text-xs mb-6">{d.approved_by || d.disbursed_by || ""}</p><Sign label="Approved by" /></div>
                  <div><p className="text-xs mb-6">{d.customer.name}</p><Sign label="Received by (Borrower), date" /></div>
                </>
              ) : (
                <>
                  <div><p className="text-xs mb-6">{d.customer.name}</p><Sign label="Borrower, ID and date" /></div>
                  <div><p className="text-xs mb-6">{d.approved_by || d.prepared_by || ""}</p><Sign label="For the Lender, date" /></div>
                  <div><p className="text-xs mb-6">&nbsp;</p><Sign label="Witness (name, ID, signature)" /></div>
                </>
              )}
            </div>
          </>
        )}

        {t === "payment_receipt" && (
          <>
            <table className="w-full text-sm mb-3"><tbody>
              <Row k="Received from" v={d.customer.name} />
              <Row k="Phone" v={d.customer.phone} />
              <Row k="For loan" v={"#" + d.loan.id} />
              <Row k="Date of payment" v={fdate(d.payment.date)} />
              <Row k="Method" v={d.payment.source === "suspense" ? "Applied from customer credit" : d.payment.source} />
              <Row k="Reference" v={d.payment.reference} />
              <Row k="Amount received" v={`${money(d.payment.amount)}  (${d.amount_words})`} />
              <Row k="Paid to date" v={money(d.loan.paid_to_date)} />
              <Row k="Balance after this payment" v={money(d.loan.balance_after)} />
              <Row k="Next instalment" v={d.next_due ? `${money(d.next_due.amount)} due ${fdate(d.next_due.due_date)}` : "None. The loan is fully paid."} />
            </tbody></table>
            <div className="grid grid-cols-2 gap-8 mt-12">
              <div><p className="text-xs mb-6">{doc.issued_by_name}</p><Sign label="Received by (Lender)" /></div>
              <div><p className="text-xs mb-6">&nbsp;</p><Sign label="Customer signature" /></div>
            </div>
          </>
        )}

        {t === "fee_receipt" && (
          <>
            <table className="w-full text-sm mb-3"><tbody>
              <Row k="Received from" v={d.customer.name} />
              <Row k="Phone" v={d.customer.phone} />
              <Row k="For loan" v={`#${d.loan.id} (${money(d.loan.amount)})`} />
              <Row k="Date" v={fdate(d.fee.date)} />
              <Row k="Reference" v={d.fee.from_credit ? "Paid from customer credit" : d.fee.reference} />
              <Row k="Processing fee received" v={`${money(d.fee.amount)}  (${d.amount_words})`} />
            </tbody></table>
            <p className="text-xs text-gray-600">This fee is separate from the loan. It does not reduce the loan balance.</p>
            <div className="grid grid-cols-2 gap-8 mt-12">
              <div><p className="text-xs mb-6">{doc.issued_by_name}</p><Sign label="Received by (Lender)" /></div>
              <div><p className="text-xs mb-6">&nbsp;</p><Sign label="Customer signature" /></div>
            </div>
          </>
        )}

        <p className="text-center text-[10px] text-gray-400 mt-8">
          System-generated document {doc.doc_no}. Issued by {doc.issued_by_name} on {fdate(doc.issued_at)}.
        </p>
      </div>
    </div>
  );
}

export default function DocPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Loading...</div>}>
      <DocView />
    </Suspense>
  );
}