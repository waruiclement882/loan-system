"use client";

export default function ExtraDoc({ doc, d, co, Row, Sign, money, fdate }: any) {
  const t = doc.doc_type;
  const sig = (a: string, b: string, nameA?: string) => (
    <div className="grid grid-cols-2 gap-8 mt-12">
      <div><p className="text-xs mb-6">{nameA || "\u00a0"}</p><Sign label={a} /></div>
      <div><p className="text-xs mb-6">&nbsp;</p><Sign label={b} /></div>
    </div>
  );

  if (t === "clearance_certificate") return (
    <>
      <p className="text-sm leading-relaxed mb-4">
        This certifies that <strong>{d.customer.name}</strong> (ID {d.customer.national_id || "-"}) has fully repaid loan #{d.loan.id} of {money(d.loan.amount)},
        disbursed on {fdate(d.loan.disbursed_at)}. No balance is owed to {co.company_name || "the Lender"} on this loan as at {fdate(d.loan.cleared_on)}.
      </p>
      <table className="w-full text-sm mb-3"><tbody>
        <Row k="Total repayable" v={money(d.loan.total_amount)} />
        <Row k="Total received" v={money(d.paid.total)} />
        <Row k="Number of payments" v={d.paid.payments} />
        <Row k="Cleared on" v={fdate(d.loan.cleared_on)} />
        {d.paid.excess > 0 && <Row k="Received above the total" v={money(d.paid.excess) + " (handled through Suspense)"} />}
      </tbody></table>
      {sig("For the Lender, date", "Customer acknowledgement, date", doc.issued_by_name)}
    </>
  );

  if (t === "write_off_memo") return (
    <>
      <table className="w-full text-sm mb-3"><tbody>
        <Row k="Borrower" v={d.customer.name} />
        <Row k="Phone / ID" v={(d.customer.phone || "-") + " / " + (d.customer.national_id || "-")} />
        <Row k="Loan" v={`#${d.loan.id}: ${money(d.loan.amount)} over ${d.loan.term_weeks} weeks, disbursed ${fdate(d.loan.disbursed_at)}`} />
        <Row k="Total repayable" v={money(d.loan.total_amount)} />
        <Row k="Collected before write-off" v={money(d.collected)} />
        <Row k="First missed instalment" v={fdate(d.first_overdue)} />
        <Row k="Instalments missed" v={d.missed} />
        <Row k="Days overdue at write-off" v={d.days_overdue ?? "-"} />
        <Row k="Balance written off" v={`${money(d.balance_written_off)}  (${d.amount_words})`} />
        <Row k="Written off on" v={fdate(d.written_off_on)} />
        <Row k="Recorded by" v={d.recorded_by} />
        <Row k="Reason" v={d.reason} />
        {d.recovered > 0 && <Row k="Recovered after write-off" v={money(d.recovered)} />}
      </tbody></table>
      <p className="text-xs text-gray-600">Recovery of this balance continues. Any later payment is recorded as bad debt recovery.</p>
      {sig("Prepared by", "Approved by (Director), date", doc.issued_by_name)}
    </>
  );

  if (t === "drawing_voucher") return (
    <>
      <table className="w-full text-sm mb-3"><tbody>
        <Row k="Date" v={fdate(d.drawing.date)} />
        <Row k="Amount" v={`${money(d.drawing.amount)}  (${d.amount_words})`} />
        <Row k="Purpose" v={d.drawing.purpose} />
        <Row k="Paid by" v={d.drawing.method} />
        <Row k="Reference" v={d.drawing.reference} />
        <Row k="Recorded by" v={d.recorded_by} />
      </tbody></table>
      <p className="text-xs text-gray-600">An owner's drawing is not a business expense and does not reduce profit.</p>
      {sig("Received by (Owner)", "Authorised by, date", d.recorded_by)}
    </>
  );

  if (t === "cash_count_sheet") {
    const c = d.count;
    return (
      <>
        <table className="w-full text-sm mb-3"><tbody>
          <Row k="Count date" v={fdate(c.date)} />
          <Row k="Cash in hand" v={money(c.cash)} />
          <Row k="Bank balance" v={money(c.bank)} />
          <Row k="M-Pesa balance" v={money(c.mpesa)} />
          <Row k="Total counted" v={money(c.counted)} />
          <Row k="System expected" v={money(c.expected)} />
          <Row k="Gap (counted less expected)" v={money(c.variance)} />
          <Row k="Change since last count" v={c.change == null ? "First count: baseline" : money(c.change)} />
          <Row k="Explanation" v={c.notes || "None given"} />
          <Row k="Counted by" v={d.recorded_by} />
        </tbody></table>
        {sig("Counted by, date", "Verified by, date", d.recorded_by)}
      </>
    );
  }

  if (t === "suspense_slip") {
    const s = d.suspense;
    return (
      <>
        <table className="w-full text-sm mb-3"><tbody>
          <Row k="Customer" v={d.customer.name} />
          <Row k="Phone" v={d.customer.phone} />
          <Row k="Entry" v={s.kind === "credit" ? "Held as customer credit" : "Credit applied"} />
          <Row k="Amount" v={`${money(s.amount)}  (${d.amount_words})`} />
          <Row k="Linked loan" v={s.loan_id ? "#" + s.loan_id : "-"} />
          <Row k="Linked payment" v={s.payment_id ? "#" + s.payment_id : "-"} />
          <Row k="Purpose" v={s.use_case} />
          <Row k="Notes" v={s.notes} />
          <Row k="Date" v={fdate(s.date)} />
        </tbody></table>
        {sig("Prepared by", "Customer acknowledgement", doc.issued_by_name)}
      </>
    );
  }

  if (t === "capital_receipt") return (
    <>
      <table className="w-full text-sm mb-3"><tbody>
        <Row k="Date" v={fdate(d.capital.date)} />
        <Row k="Type" v={d.capital.kind === "opening" ? "Opening balance carried over" : "Capital contribution"} />
        <Row k="Amount received" v={`${money(d.capital.amount)}  (${d.amount_words})`} />
        <Row k="Description" v={d.capital.description} />
        <Row k="Reference" v={d.capital.reference} />
        <Row k="Recorded by" v={d.recorded_by} />
      </tbody></table>
      {sig("Received for the business", "Contributor", d.recorded_by)}
    </>
  );

  if (t === "month_end_pack") {
    const f = d.funds;
    const line = (k: string, v: number, sign: string) => (
      <tr className="border-b" key={k}><td className="py-1.5">{k}</td><td className="py-1.5 text-right">{sign} {money(Math.abs(v))}</td></tr>
    );
    return (
      <>
        {d.period.interim && <p className="mb-3 p-2 border-2 border-amber-600 text-amber-800 text-sm font-semibold">INTERIM: this month had not ended when this pack was issued.</p>}
        <p className="text-sm mb-1"><strong>{d.period.label}</strong> · {d.branch.name} · cash basis</p>
        <p className="text-xs text-gray-500 mb-3">Funds are cash, bank and M-Pesa together. This pack is a cash record; it does not replace the Profit and Loss page.</p>
        <table className="w-full text-sm mb-4"><tbody>
          <tr className="border-b font-semibold"><td className="py-1.5">Opening funds</td><td className="py-1.5 text-right">{money(f.opening)}</td></tr>
          {line("Capital contributed", f.capital, "+")}
          {line("Loan repayments collected", f.collections, "+")}
          {line("Fees and other income", f.income, "+")}
          {line("Loans disbursed (" + d.loans_disbursed + ")", f.disbursed, "−")}
          {line("Approved expenses", f.expenses, "−")}
          {line("Owner drawings", f.drawings, "−")}
          <tr className="border-t-2 font-semibold"><td className="py-1.5">Closing funds</td><td className="py-1.5 text-right">{money(f.closing)}</td></tr>
        </tbody></table>

        <p className="text-sm font-medium">Cash counts this month</p>
        <table className="w-full text-xs mb-4 border"><thead className="bg-gray-50"><tr className="text-left"><th className="p-1.5">Date</th><th>Expected</th><th>Counted</th><th>Gap</th><th>Change</th></tr></thead>
          <tbody>{d.counts.length === 0 ? <tr><td className="p-1.5 text-gray-400" colSpan={5}>No count recorded</td></tr> :
            d.counts.map((c: any, i: number) => <tr key={i} className="border-t"><td className="p-1.5">{fdate(c.date)}</td><td>{money(c.expected)}</td><td>{money(c.counted)}</td><td>{money(c.variance)}</td><td>{c.change == null ? "baseline" : money(c.change)}</td></tr>)}</tbody></table>

        <p className="text-sm font-medium">Expense register</p>
        <table className="w-full text-xs mb-4 border"><thead className="bg-gray-50"><tr className="text-left"><th className="p-1.5">Date</th><th>Voucher</th><th>Category</th><th>Description</th><th className="text-right pr-1.5">Amount</th></tr></thead>
          <tbody>{d.expenses.length === 0 ? <tr><td className="p-1.5 text-gray-400" colSpan={5}>No approved expenses</td></tr> :
            d.expenses.map((e: any, i: number) => <tr key={i} className="border-t"><td className="p-1.5">{fdate(e.date)}</td><td>{e.voucher_no || "-"}</td><td>{e.category}</td><td>{e.description}</td><td className="text-right pr-1.5">{money(e.amount)}</td></tr>)}</tbody></table>

        <p className="text-sm font-medium">Owner drawings</p>
        <table className="w-full text-xs mb-4 border"><tbody>{d.drawings.length === 0 ? <tr><td className="p-1.5 text-gray-400">None</td></tr> :
          d.drawings.map((x: any, i: number) => <tr key={i} className="border-t"><td className="p-1.5">{fdate(x.date)}</td><td>{x.purpose}</td><td>{x.method}</td><td className="text-right pr-1.5">{money(x.amount)}</td></tr>)}</tbody></table>

        <p className="text-sm font-medium">Arrears on the day this pack was issued ({fdate(d.arrears.as_at)})</p>
        <p className="text-sm mb-4">{d.arrears.loans} active loans with overdue instalments, owing {money(d.arrears.balance)} in total.</p>

        <p className="text-sm font-medium">Documents issued this month</p>
        <table className="w-full text-xs mb-2 border"><tbody>{d.documents.length === 0 ? <tr><td className="p-1.5 text-gray-400">None</td></tr> :
          d.documents.map((x: any) => <tr key={x.doc_type} className="border-t"><td className="p-1.5">{x.doc_type.replace(/_/g, " ")}</td><td>{x.issued} issued</td><td>{x.cancelled} cancelled</td></tr>)}</tbody></table>
        {sig("Prepared by", "Reviewed by, date", doc.issued_by_name)}
      </>
    );
  }

  return null;
}