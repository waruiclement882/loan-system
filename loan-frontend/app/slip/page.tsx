"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getLoans } from "@/lib/api";
import Layout from "../components/Layout";

export default function SlipPage() {
  const router = useRouter();
  const [loans, setLoans] = useState<any[]>([]);
  const [selectedLoan, setSelectedLoan] = useState<any>(null);
  const PAYBILL = process.env.NEXT_PUBLIC_KCB_PAYBILL || "Enter Paybill";

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    loadLoans();
  }, []);

  const loadLoans = async () => {
    const l = await getLoans();
    const active = Array.isArray(l) ? l.filter((x: any) => x.status === "active" || x.status === "approved") : [];
    setLoans(active);
  };

  const printSlip = () => window.print();

  return (
    <Layout>
      <div className="print:hidden p-6">
        <h2 className="text-2xl font-bold mb-6 text-[#04342C]">Payment Instruction Slip</h2>
        <div className="bg-white rounded-lg shadow p-6 mb-6 max-w-md">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Loan</label>
          <select
            onChange={(e) => {
              const loan = loans.find((l: any) => l.id === parseInt(e.target.value));
              setSelectedLoan(loan || null);
            }}
            className="w-full border rounded-lg px-3 py-2 mb-4"
          >
            <option value="">Select a loan...</option>
            {loans.map((l: any) => (
              <option key={l.id} value={l.id}>
                #{l.id} - {l.customer_name} (KSh {parseFloat(l.amount).toLocaleString()})
              </option>
            ))}
          </select>
          {selectedLoan && (
            <button onClick={printSlip} className="w-full bg-[#0F6E56] text-white px-4 py-2 rounded-lg hover:bg-[#085041]">
              Print Slip
            </button>
          )}
        </div>
      </div>

      {selectedLoan && (
        <div className="print:block hidden p-8" id="slip">
          <div style={{border: '2px solid #000', padding: '24px', maxWidth: '400px', margin: '0 auto', fontFamily: 'Arial, sans-serif'}}>
            <div style={{textAlign: 'center', marginBottom: '16px'}}>
              <h2 style={{fontSize: '20px', fontWeight: 'bold', margin: '0'}}>LOAN REPAYMENT SLIP</h2>
              <p style={{fontSize: '12px', color: '#666', margin: '4px 0'}}>Keep this slip for reference</p>
            </div>
            <hr style={{border: '1px solid #000', margin: '12px 0'}} />
            <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '14px'}}>
              <tbody>
                <tr>
                  <td style={{padding: '6px 0', fontWeight: 'bold'}}>Customer Name:</td>
                  <td style={{padding: '6px 0'}}>{selectedLoan.customer_name}</td>
                </tr>
                <tr>
                  <td style={{padding: '6px 0', fontWeight: 'bold'}}>Loan ID:</td>
                  <td style={{padding: '6px 0', fontSize: '18px', color: '#1d4ed8'}}>#{selectedLoan.id}</td>
                </tr>
                <tr>
                  <td style={{padding: '6px 0', fontWeight: 'bold'}}>Loan Amount:</td>
                  <td style={{padding: '6px 0'}}>KSh {parseFloat(selectedLoan.amount).toLocaleString()}</td>
                </tr>
                <tr>
                  <td style={{padding: '6px 0', fontWeight: 'bold'}}>Term:</td>
                  <td style={{padding: '6px 0'}}>{selectedLoan.term_weeks} weeks</td>
                </tr>
                <tr>
                  <td style={{padding: '6px 0', fontWeight: 'bold'}}>Weekly Installment:</td>
                  <td style={{padding: '6px 0', color: '#1d4ed8', fontWeight: 'bold'}}>KSh {parseFloat(selectedLoan.weekly_installment || 0).toLocaleString()}</td>
                </tr>
                <tr>
                  <td style={{padding: '6px 0', fontWeight: 'bold'}}>Total Interest:</td>
                  <td style={{padding: '6px 0'}}>KSh {parseFloat(selectedLoan.interest_amount || 0).toLocaleString()}</td>
                </tr>
                <tr>
                  <td style={{padding: '6px 0', fontWeight: 'bold'}}>Total to Repay:</td>
                  <td style={{padding: '6px 0'}}>KSh {parseFloat(selectedLoan.total_amount || 0).toLocaleString()}</td>
                </tr>
                <tr>
                  <td style={{padding: '6px 0', fontWeight: 'bold'}}>Balance:</td>
                  <td style={{padding: '6px 0', color: '#dc2626'}}>KSh {parseFloat(selectedLoan.balance || 0).toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
            <hr style={{border: '1px solid #000', margin: '12px 0'}} />
            <div style={{background: '#f0fdf4', border: '1px solid #86efac', padding: '12px', borderRadius: '8px'}}>
              <h3 style={{fontSize: '14px', fontWeight: 'bold', margin: '0 0 8px 0', color: '#166534'}}>HOW TO PAY via KCB Paybill</h3>
              <p style={{margin: '4px 0', fontSize: '13px'}}><strong>Step 1:</strong> Go to M-Pesa</p>
              <p style={{margin: '4px 0', fontSize: '13px'}}><strong>Step 2:</strong> Select Lipa na M-Pesa</p>
              <p style={{margin: '4px 0', fontSize: '13px'}}><strong>Step 3:</strong> Select Pay Bill</p>
              <p style={{margin: '4px 0', fontSize: '13px'}}><strong>Step 4:</strong> Business No: <strong style={{fontSize: '16px', color: '#1d4ed8'}}>{PAYBILL}</strong></p>
              <p style={{margin: '4px 0', fontSize: '13px'}}><strong>Step 5:</strong> Account No: <strong style={{fontSize: '16px', color: '#dc2626'}}>8086860</strong></p>
              <p style={{margin: '4px 0', fontSize: '13px'}}><strong>Step 6:</strong> Enter amount and confirm</p>
            </div>
            <div style={{textAlign: 'center', marginTop: '16px', fontSize: '11px', color: '#666'}}>
              <p>Payment is automatically recorded when received</p>
              <p>For support, contact us</p>
            </div>
          </div>
        </div>
      )}

      {selectedLoan && (
        <div className="print:hidden p-6">
          <div className="bg-white border-2 border-gray-300 rounded-lg p-6 max-w-md mx-auto">
            <div className="text-center mb-4">
              <h2 className="text-xl font-bold">LOAN REPAYMENT SLIP</h2>
              <p className="text-xs text-gray-500">Keep this slip for reference</p>
            </div>
            <hr className="my-3" />
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="font-bold">Customer:</span><span>{selectedLoan.customer_name}</span></div>
              <div className="flex justify-between"><span className="font-bold">Loan ID:</span><span className="text-[#0F6E56] text-lg font-bold">#{selectedLoan.id}</span></div>
              <div className="flex justify-between"><span className="font-bold">Loan Amount:</span><span>KSh {parseFloat(selectedLoan.amount).toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="font-bold">Term:</span><span>{selectedLoan.term_weeks} weeks</span></div>
              <div className="flex justify-between"><span className="font-bold">Weekly Installment:</span><span className="text-[#0F6E56] font-bold">KSh {parseFloat(selectedLoan.weekly_installment || 0).toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="font-bold">Total Interest:</span><span>KSh {parseFloat(selectedLoan.interest_amount || 0).toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="font-bold">Total to Repay:</span><span>KSh {parseFloat(selectedLoan.total_amount || 0).toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="font-bold">Balance:</span><span className="text-red-600">KSh {parseFloat(selectedLoan.balance || 0).toLocaleString()}</span></div>
            </div>
            <hr className="my-3" />
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <h3 className="font-bold text-green-700 mb-2 text-sm">HOW TO PAY via KCB Paybill</h3>
              <p className="text-xs">Business No: <strong className="text-[#0F6E56] text-base">{PAYBILL}</strong></p>
              <p className="text-xs">Account No: <strong className="text-red-600 text-base">8086860</strong></p>
            </div>
            <button onClick={printSlip} className="w-full mt-4 bg-[#0F6E56] text-white px-4 py-2 rounded-lg hover:bg-[#085041]">
              Print Slip
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
}
