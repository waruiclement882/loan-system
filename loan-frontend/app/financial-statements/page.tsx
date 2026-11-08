"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";

const API = process.env.NEXT_PUBLIC_API_URL || "https://loan-system-h794.onrender.com";
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export default function FinancialStatementsPage() {
  const router = useRouter();
  const [tab, setTab] = useState("income");
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [pnl, setPnl] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [par, setPar] = useState<any>(null);
  const [monthly, setMonthly] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cashBalance, setCashBalance] = useState(125000);
  const [mpesaFloat, setMpesaFloat] = useState(45000);
  const [ownerCapital, setOwnerCapital] = useState(350000);
  const [retainedEarnings, setRetainedEarnings] = useState(98000);
  const [fixedAssets, setFixedAssets] = useState(37000);
  const [openingCash, setOpeningCash] = useState(98000);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
  const headers = { "Content-Type": "application/json", Authorization: "Bearer " + token };

  useEffect(() => {
    if (!token) { router.push("/login"); return; }
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (!["admin","cfo"].includes(user.role)) { router.push("/dashboard"); return; }
    loadAll();
  }, []);

  useEffect(() => { if (token) loadAll(); }, [month, year]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [pnlRes, sumRes, parRes, monRes] = await Promise.all([
        fetch(`${API}/api/expenses/pnl?month=${month}&year=${year}`, { headers }),
        fetch(`${API}/api/reports/summary`, { headers }),
        fetch(`${API}/api/reports/par`, { headers }),
        fetch(`${API}/api/reports/monthly`, { headers }),
      ]);
      const [p, s, pa, mo] = await Promise.all([pnlRes.json(), sumRes.json(), parRes.json(), monRes.json()]);
      setPnl(p); setSummary(s); setPar(pa); setMonthly(mo);
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  const fmt = (n: number) => "KSh " + Math.round(n || 0).toLocaleString();
  const fmtN = (n: number) => Math.round(n || 0).toLocaleString();

  const interestIncome = pnl?.income?.repayments?.interest || 0;
  const processingFees = pnl?.income?.processing_fees?.total || 0;
  const floatIncome = pnl?.income?.float_income?.total || 0;
  const totalRevenue = interestIncome + processingFees + floatIncome;
  const totalExpenses = pnl?.expenses?.total || 0;
  const expBreakdown = pnl?.expenses?.breakdown || [];
  const provisionAmount = par ? (parseFloat(par.overdueBalance || 0) * 0.5) : 0;
  const netRevAfterProvision = totalRevenue - provisionAmount;
  const netProfit = netRevAfterProvision - totalExpenses;
  const grossLoan = summary?.total_outstanding || 0;
  const netLoan = grossLoan - provisionAmount;
  const totalAssets = cashBalance + mpesaFloat + netLoan + fixedAssets;
  const accruedExp = totalExpenses * 0.3;
  const totalEquity = ownerCapital + retainedEarnings + netProfit;
  const totalLE = accruedExp + totalEquity;
  const cashFromOps = (pnl?.income?.repayments?.total || 0) + processingFees - totalExpenses;
  const loansDisbursed = -(pnl?.disbursed?.total || 0);
  const principalRecovered = pnl?.income?.repayments?.principal || 0;
  const netInvesting = loansDisbursed + principalRecovered;
  const closingCash = openingCash + cashFromOps + netInvesting;

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    const mn = MONTHS[month - 1] + " " + year;
    const isData = [
      ["LUNAR LUMINA SOLUTIONS - INCOME STATEMENT"],
      ["Period: " + mn], [],
      ["Interest Income", interestIncome],
      ["Processing Fees", processingFees],
      ["Float Income", floatIncome],
      ["TOTAL REVENUE", totalRevenue], [],
      ["Provision for Loan Losses", -provisionAmount],
      ["NET REVENUE AFTER PROVISION", netRevAfterProvision], [],
      ...expBreakdown.map((e: any) => [e.category, parseFloat(e.total)]),
      ["TOTAL EXPENSES", -totalExpenses], [],
      ["NET PROFIT / (LOSS)", netProfit],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(isData), "Income Statement");
    const bsData = [
      ["LUNAR LUMINA SOLUTIONS - BALANCE SHEET"], ["As at " + mn], [],
      ["Cash & Equivalents", cashBalance], ["Mpesa / Float", mpesaFloat],
      ["Net Loan Portfolio", netLoan], ["Fixed Assets", fixedAssets],
      ["TOTAL ASSETS", totalAssets], [],
      ["Accrued Expenses", accruedExp], ["Owner Capital", ownerCapital],
      ["Retained Earnings", retainedEarnings], ["Current Profit", netProfit],
      ["TOTAL LIABILITIES & EQUITY", totalLE],
      ["BALANCE CHECK", Math.abs(totalAssets - totalLE) < 1 ? "BALANCED" : "OUT OF BALANCE"],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(bsData), "Balance Sheet");
    const cfData = [
      ["LUNAR LUMINA SOLUTIONS - CASH FLOW"], ["Period: " + mn], [],
      ["Collections", pnl?.income?.repayments?.total || 0],
      ["Processing Fees", processingFees], ["Expenses Paid", -totalExpenses],
      ["NET FROM OPERATIONS", cashFromOps], [],
      ["Loans Disbursed", loansDisbursed], ["Principal Recovered", principalRecovered],
      ["NET FROM INVESTING", netInvesting], [],
      ["Opening Cash", openingCash], ["CLOSING CASH", closingCash],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(cfData), "Cash Flow");
    XLSX.writeFile(wb, "LunarLumina_FS_" + mn.replace(" ", "_") + ".xlsx");
  };

  if (loading) return (
    <div className="min-h-screen bg-[#F4F7F5] flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-[#1D9E75] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-500">Loading financial data...</p>
      </div>
    </div>
  );
    return (
    <div className="min-h-screen bg-[#F4F7F5] p-4 md:p-6">
      <div className="bg-[#04342C] rounded-2xl p-5 mb-6 text-white">
        <div className="flex justify-between items-start flex-wrap gap-3">
          <div>
            <p className="text-xs text-emerald-300 font-medium uppercase tracking-wide mb-1">Financial Statements</p>
            <h1 className="text-2xl font-bold">Lunar Lumina Solutions</h1>
            <p className="text-emerald-200/70 text-sm mt-1">Microfinance — Rongai, Nairobi</p>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <select value={month} onChange={e => setMonth(parseInt(e.target.value))}
              className="bg-white/10 text-white border border-white/20 rounded-lg px-3 py-2 text-sm">
              {MONTHS.map((m, i) => <option key={i} value={i + 1} className="text-black">{m}</option>)}
            </select>
            <select value={year} onChange={e => setYear(parseInt(e.target.value))}
              className="bg-white/10 text-white border border-white/20 rounded-lg px-3 py-2 text-sm">
              {[2025, 2026, 2027].map(y => <option key={y} value={y} className="text-black">{y}</option>)}
            </select>
            <button onClick={exportExcel}
              className="bg-[#1D9E75] hover:bg-[#17876A] text-white px-5 py-2 rounded-lg text-sm font-semibold">
              Export Excel
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
          {[
            ["Total Revenue", fmt(totalRevenue)],
            ["Net Profit", fmt(netProfit)],
            ["Total Expenses", fmt(totalExpenses)],
            ["OSS Ratio", totalExpenses > 0 ? ((totalRevenue / totalExpenses) * 100).toFixed(0) + "%" : "0%"],
          ].map(([label, val]) => (
            <div key={label} className="bg-white/10 rounded-xl p-3">
              <p className="text-xs text-emerald-300">{label}</p>
              <p className="text-lg font-bold text-white mt-1">{val}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2 mb-5 flex-wrap">
        {[["income","Income Statement"],["balance","Balance Sheet"],["cashflow","Cash Flow"],["portfolio","Loan Portfolio"]].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${tab === id ? "bg-[#04342C] text-white" : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === "income" && (
        <div className="bg-white rounded-2xl border border-[#D9E2DC] overflow-hidden">
          <div className="bg-[#04342C] px-6 py-4">
            <h2 className="text-white font-bold text-lg">Income Statement</h2>
            <p className="text-emerald-300 text-xs mt-0.5">For the period ending {MONTHS[month - 1]} {year}</p>
          </div>
          <div className="divide-y divide-gray-100">
            <div className="px-6 py-3 bg-gray-50"><p className="text-xs font-semibold text-gray-500 uppercase">Revenue</p></div>
            {[
              ["Interest Income on Loan Portfolio", interestIncome],
              ["Processing Fee Income", processingFees],
              ["Float & Other Income", floatIncome],
            ].map(([label, val]) => (
              <div key={label as string} className="px-6 py-3 flex justify-between">
                <span className="text-sm text-gray-700 pl-4">{label}</span>
                <span className="text-sm font-medium">{fmt(val as number)}</span>
              </div>
            ))}
            <div className="px-6 py-3 flex justify-between bg-emerald-50">
              <span className="text-sm font-bold text-emerald-800">TOTAL REVENUE</span>
              <span className="text-sm font-bold text-emerald-800">{fmt(totalRevenue)}</span>
            </div>
            <div className="px-6 py-3 bg-gray-50"><p className="text-xs font-semibold text-gray-500 uppercase">Provision for Loan Losses</p></div>
            <div className="px-6 py-3 flex justify-between">
              <span className="text-sm text-gray-700 pl-4">Provision (50% of overdue portfolio)</span>
              <span className="text-sm font-medium text-red-600">({fmt(provisionAmount)})</span>
            </div>
            <div className="px-6 py-3 flex justify-between bg-blue-50">
              <span className="text-sm font-bold text-blue-800">NET REVENUE AFTER PROVISION</span>
              <span className="text-sm font-bold text-blue-800">{fmt(netRevAfterProvision)}</span>
            </div>
            <div className="px-6 py-3 bg-gray-50"><p className="text-xs font-semibold text-gray-500 uppercase">Operating Expenses</p></div>
            {expBreakdown.length > 0 ? expBreakdown.map((e: any) => (
              <div key={e.category} className="px-6 py-3 flex justify-between">
                <span className="text-sm text-gray-700 pl-4">{e.category}</span>
                <span className="text-sm font-medium">{fmt(parseFloat(e.total))}</span>
              </div>
            )) : <div className="px-6 py-3 text-sm text-gray-400 pl-10">No expenses recorded for this period</div>}
            <div className="px-6 py-3 flex justify-between bg-red-50">
              <span className="text-sm font-bold text-red-800">TOTAL OPERATING EXPENSES</span>
              <span className="text-sm font-bold text-red-800">{fmt(totalExpenses)}</span>
            </div>
            <div className={`px-6 py-4 flex justify-between ${netProfit >= 0 ? "bg-emerald-100" : "bg-red-100"}`}>
              <span className={`font-bold text-base ${netProfit >= 0 ? "text-emerald-900" : "text-red-900"}`}>NET PROFIT / (LOSS)</span>
              <span className={`font-bold text-base ${netProfit >= 0 ? "text-emerald-900" : "text-red-900"}`}>
                {netProfit < 0 ? "(" + fmt(Math.abs(netProfit)) + ")" : fmt(netProfit)}
              </span>
            </div>
            <div className="px-6 py-3 bg-gray-50"><p className="text-xs font-semibold text-gray-500 uppercase">Key Ratios</p></div>
            {[
              ["Profit Margin", totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) + "%" : "0%"],
              ["OSS Ratio", totalExpenses > 0 ? ((totalRevenue / totalExpenses) * 100).toFixed(0) + "%" : "0%"],
              ["Cost per Active Borrower", fmt(summary?.active_loans > 0 ? totalExpenses / summary.active_loans : 0)],
            ].map(([label, val]) => (
              <div key={label} className="px-6 py-2.5 flex justify-between">
                <span className="text-sm text-gray-600 pl-4">{label}</span>
                <span className="text-sm font-semibold text-[#04342C]">{val}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "balance" && (
        <div className="bg-white rounded-2xl border border-[#D9E2DC] overflow-hidden">
          <div className="bg-[#04342C] px-6 py-4 flex justify-between items-center">
            <div>
              <h2 className="text-white font-bold text-lg">Balance Sheet</h2>
              <p className="text-emerald-300 text-xs mt-0.5">As at {MONTHS[month - 1]} {year} — Yellow fields are editable</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${Math.abs(totalAssets - totalLE) < 1 ? "bg-emerald-400 text-emerald-900" : "bg-red-400 text-white"}`}>
              {Math.abs(totalAssets - totalLE) < 1 ? "BALANCED ✓" : "OUT OF BALANCE ✗"}
            </span>
          </div>
          <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">
            <div className="divide-y divide-gray-100">
              <div className="px-5 py-3 bg-gray-50"><p className="text-xs font-semibold text-gray-500 uppercase">Assets</p></div>
              {[{l:"Cash & Cash Equivalents",v:cashBalance,s:setCashBalance},{l:"Mpesa / KCB Float",v:mpesaFloat,s:setMpesaFloat}].map(({l,v,s}) => (
                <div key={l} className="px-5 py-2.5 flex justify-between items-center">
                  <span className="text-sm text-gray-700 pl-3">{l}</span>
                  <input type="number" value={v} onChange={e => s(parseFloat(e.target.value) || 0)}
                    className="w-32 text-right text-sm border border-yellow-300 bg-yellow-50 rounded px-2 py-1 focus:outline-none" />
                </div>
              ))}
              <div className="px-5 py-2.5 flex justify-between items-center">
                <span className="text-sm text-gray-700 pl-3">Gross Loan Portfolio</span>
                <span className="text-sm font-medium">{fmt(grossLoan)}</span>
              </div>
              <div className="px-5 py-2.5 flex justify-between items-center">
                <span className="text-sm text-gray-700 pl-3">Less: Allowance for Losses</span>
                <span className="text-sm font-medium text-red-600">({fmt(provisionAmount)})</span>
              </div>
              <div className="px-5 py-2.5 flex justify-between items-center bg-blue-50">
                <span className="text-sm font-semibold text-blue-800 pl-3">Net Loan Portfolio</span>
                <span className="text-sm font-semibold text-blue-800">{fmt(netLoan)}</span>
              </div>
              <div className="px-5 py-2.5 flex justify-between items-center">
                <span className="text-sm text-gray-700 pl-3">Fixed Assets (Net)</span>
                <input type="number" value={fixedAssets} onChange={e => setFixedAssets(parseFloat(e.target.value) || 0)}
                  className="w-32 text-right text-sm border border-yellow-300 bg-yellow-50 rounded px-2 py-1 focus:outline-none" />
              </div>
              <div className="px-5 py-3 flex justify-between bg-emerald-50">
                <span className="text-sm font-bold text-emerald-900">TOTAL ASSETS</span>
                <span className="text-sm font-bold text-emerald-900">{fmt(totalAssets)}</span>
              </div>
            </div>
            <div className="divide-y divide-gray-100">
              <div className="px-5 py-3 bg-gray-50"><p className="text-xs font-semibold text-gray-500 uppercase">Liabilities & Equity</p></div>
              <div className="px-5 py-2.5 flex justify-between items-center">
                <span className="text-sm text-gray-700 pl-3">Accrued Expenses</span>
                <span className="text-sm font-medium">{fmt(accruedExp)}</span>
              </div>
              <div className="px-5 py-2.5 flex justify-between bg-red-50">
                <span className="text-sm font-semibold text-red-800 pl-3">TOTAL LIABILITIES</span>
                <span className="text-sm font-semibold text-red-800">{fmt(accruedExp)}</span>
              </div>
              {[{l:"Owner Capital",v:ownerCapital,s:setOwnerCapital},{l:"Retained Earnings",v:retainedEarnings,s:setRetainedEarnings}].map(({l,v,s}) => (
                <div key={l} className="px-5 py-2.5 flex justify-between items-center">
                  <span className="text-sm text-gray-700 pl-3">{l}</span>
                  <input type="number" value={v} onChange={e => s(parseFloat(e.target.value) || 0)}
                    className="w-32 text-right text-sm border border-yellow-300 bg-yellow-50 rounded px-2 py-1 focus:outline-none" />
                </div>
              ))}
              <div className="px-5 py-2.5 flex justify-between items-center">
                <span className="text-sm text-gray-700 pl-3">Current Period Net Profit</span>
                <span className={`text-sm font-medium ${netProfit >= 0 ? "text-emerald-700" : "text-red-600"}`}>{fmt(netProfit)}</span>
              </div>
              <div className="px-5 py-2.5 flex justify-between bg-blue-50">
                <span className="text-sm font-semibold text-blue-800 pl-3">TOTAL EQUITY</span>
                <span className="text-sm font-semibold text-blue-800">{fmt(totalEquity)}</span>
              </div>
              <div className="px-5 py-3 flex justify-between bg-emerald-50">
                <span className="text-sm font-bold text-emerald-900">TOTAL LIABILITIES & EQUITY</span>
                <span className="text-sm font-bold text-emerald-900">{fmt(totalLE)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "cashflow" && (
        <div className="bg-white rounded-2xl border border-[#D9E2DC] overflow-hidden">
          <div className="bg-[#04342C] px-6 py-4">
            <h2 className="text-white font-bold text-lg">Cash Flow Statement</h2>
            <p className="text-emerald-300 text-xs mt-0.5">For the period ending {MONTHS[month - 1]} {year}</p>
          </div>
          <div className="divide-y divide-gray-100">
            <div className="px-6 py-3 bg-gray-50"><p className="text-xs font-semibold text-gray-500 uppercase">A. Operating Activities</p></div>
            {[
              ["Collections (Interest + Principal)", pnl?.income?.repayments?.total || 0],
              ["Processing Fees Collected", processingFees],
              ["Operating Expenses Paid", -totalExpenses],
            ].map(([l, v]) => (
              <div key={l as string} className="px-6 py-3 flex justify-between">
                <span className="text-sm text-gray-700 pl-4">{l}</span>
                <span className={`text-sm font-medium ${(v as number) < 0 ? "text-red-600" : "text-gray-900"}`}>
                  {(v as number) < 0 ? "(" + fmt(Math.abs(v as number)) + ")" : fmt(v as number)}
                </span>
              </div>
            ))}
            <div className="px-6 py-3 flex justify-between bg-blue-50">
              <span className="text-sm font-bold text-blue-800">NET CASH FROM OPERATIONS</span>
              <span className="text-sm font-bold text-blue-800">{cashFromOps < 0 ? "(" + fmt(Math.abs(cashFromOps)) + ")" : fmt(cashFromOps)}</span>
            </div>
            <div className="px-6 py-3 bg-gray-50"><p className="text-xs font-semibold text-gray-500 uppercase">B. Investing Activities</p></div>
            {[["Loans Disbursed", loansDisbursed],["Principal Recovered", principalRecovered]].map(([l, v]) => (
              <div key={l as string} className="px-6 py-3 flex justify-between">
                <span className="text-sm text-gray-700 pl-4">{l}</span>
                <span className={`text-sm font-medium ${(v as number) < 0 ? "text-red-600" : "text-gray-900"}`}>
                  {(v as number) < 0 ? "(" + fmt(Math.abs(v as number)) + ")" : fmt(v as number)}
                </span>
              </div>
            ))}
            <div className="px-6 py-3 flex justify-between bg-blue-50">
              <span className="text-sm font-bold text-blue-800">NET CASH FROM INVESTING</span>
              <span className="text-sm font-bold text-blue-800">{netInvesting < 0 ? "(" + fmt(Math.abs(netInvesting)) + ")" : fmt(netInvesting)}</span>
            </div>
            <div className="px-6 py-3 bg-gray-50"><p className="text-xs font-semibold text-gray-500 uppercase">C. Financing Activities</p></div>
            <div className="px-6 py-3 flex justify-between">
              <span className="text-sm text-gray-700 pl-4">Capital Injected / Borrowings</span>
              <span className="text-sm font-medium">{fmt(0)}</span>
            </div>
            <div className="px-6 py-3 flex justify-between bg-blue-50">
              <span className="text-sm font-bold text-blue-800">NET CASH FROM FINANCING</span>
              <span className="text-sm font-bold text-blue-800">{fmt(0)}</span>
            </div>
            <div className="px-6 py-3 flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-700">Opening Cash Balance</span>
              <input type="number" value={openingCash} onChange={e => setOpeningCash(parseFloat(e.target.value) || 0)}
                className="w-36 text-right text-sm border border-yellow-300 bg-yellow-50 rounded px-2 py-1 focus:outline-none" />
            </div>
            <div className="px-6 py-4 flex justify-between bg-emerald-100">
              <span className="text-base font-bold text-emerald-900">CLOSING CASH BALANCE</span>
              <span className="text-base font-bold text-emerald-900">{fmt(closingCash)}</span>
            </div>
          </div>
        </div>
      )}

      {tab === "portfolio" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              ["Total Loans", fmtN(summary?.total_loans || 0)],
              ["Active Loans", fmtN(summary?.active_loans || 0)],
              ["Total Outstanding", fmt(summary?.total_outstanding || 0)],
              ["Collection Rate", (summary?.collection_rate || 0) + "%"],
            ].map(([l, v]) => (
              <div key={l} className="bg-white rounded-xl border border-[#D9E2DC] p-4">
                <p className="text-xs text-gray-500 font-medium">{l}</p>
                <p className="text-xl font-bold text-[#04342C] mt-1">{v}</p>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-2xl border border-[#D9E2DC] p-5">
            <h3 className="font-bold text-[#04342C] mb-4">PAR Analysis</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                ["Total Portfolio", fmt(par?.totalPortfolio || 0)],
                ["Overdue Balance", fmt(par?.overdueBalance || 0)],
                ["PAR Rate", (par?.par || 0) + "%"],
                ["Provision Required", fmt(provisionAmount)],
              ].map(([l, v]) => (
                <div key={l} className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                  <p className="text-xs text-gray-500">{l}</p>
                  <p className="text-base font-bold text-[#04342C] mt-1">{v}</p>
                </div>
              ))}
            </div>
          </div>
          {monthly?.rows?.length > 0 && (
            <div className="bg-white rounded-2xl border border-[#D9E2DC] overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="font-bold text-[#04342C]">Monthly Breakdown</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>{["Month","Loans","Disbursed","Collected","Fees"].map(h => <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {monthly.rows.map((r: any, i: number) => (
                      <tr key={i} className={i % 2 === 0 ? "" : "bg-gray-50"}>
                        <td className="px-4 py-2.5 font-medium">{r.month}</td>
                        <td className="px-4 py-2.5 text-gray-600">{r.loans_disbursed}</td>
                        <td className="px-4 py-2.5">{fmt(r.amount_disbursed)}</td>
                        <td className="px-4 py-2.5 text-emerald-600 font-medium">{fmt(r.amount_collected)}</td>
                        <td className="px-4 py-2.5">{fmt(r.processing_fees)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}