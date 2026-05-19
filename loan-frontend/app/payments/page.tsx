'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function PaymentsPage() {
  const router = useRouter();
  const [payments, setPayments] = useState<any[]>([]);
  const [loans, setLoans] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ loan_id: '', amount: '', transaction_code: '', source: 'mpesa' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    loadData();
  }, []);

  const loadData = async () => {
    const token = localStorage.getItem('token');
    const h = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token };
    const base = 'https://loan-system-h794.onrender.com';
    fetch(base + '/api/payments', { headers: h }).then(r => r.json()).then(d => setPayments(Array.isArray(d) ? d : []));
    fetch(base + '/api/loans', { headers: h }).then(r => r.json()).then(d => setLoans(Array.isArray(d) ? d : []));
  };

  const handleSubmit = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    const h = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token };
    await fetch('https://loan-system-h794.onrender.com/api/payments', {
      method: 'POST', headers: h, body: JSON.stringify(form)
    });
    setForm({ loan_id: '', amount: '', transaction_code: '', source: 'mpesa' });
    setShowForm(false);
    loadData();
    setLoading(false);
  };

  const totalCollected = payments.reduce((s, p) => s + parseFloat(p.amount || 0), 0);

  return (
    <div style={{minHeight:'100vh',background:'#f3f4f6'}}>
      <nav style={{background:'white',padding:'1rem 1.5rem',display:'flex',justifyContent:'space-between',alignItems:'center',boxShadow:'0 1px 3px rgba(0,0,0,0.1)'}}>
        <h1 style={{color:'#2563eb',fontWeight:'bold',fontSize:'1.25rem'}}>Microfinance System</h1>
        <div style={{display:'flex',gap:'1rem'}}>
          <button onClick={() => router.push('/dashboard')} style={{background:'none',border:'none',cursor:'pointer',color:'#374151'}}>Dashboard</button>
          <button onClick={() => router.push('/customers')} style={{background:'none',border:'none',cursor:'pointer',color:'#374151'}}>Customers</button>
          <button onClick={() => router.push('/loans')} style={{background:'none',border:'none',cursor:'pointer',color:'#374151'}}>Loans</button>
        </div>
      </nav>
      <div style={{padding:'1.5rem'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1.5rem'}}>
          <div>
            <h2 style={{fontSize:'1.5rem',fontWeight:'bold',margin:0}}>Payments</h2>
            <p style={{color:'#6b7280',margin:'4px 0 0'}}>Total Collected: <strong style={{color:'#16a34a'}}>KSh {totalCollected.toLocaleString()}</strong></p>
          </div>
          <button onClick={() => setShowForm(!showForm)} style={{background:'#2563eb',color:'white',border:'none',padding:'8px 16px',borderRadius:'6px',cursor:'pointer'}}>+ Record Payment</button>
        </div>
        {showForm && (
          <div style={{background:'white',borderRadius:'8px',padding:'1.5rem',marginBottom:'1.5rem',boxShadow:'0 1px 3px rgba(0,0,0,0.1)'}}>
            <h3 style={{fontWeight:'bold',marginBottom:'1rem'}}>Record Manual Payment</h3>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem'}}>
              <div>
                <label style={{display:'block',marginBottom:'4px',fontSize:'0.875rem'}}>Loan</label>
                <select value={form.loan_id} onChange={(e) => setForm({...form, loan_id: e.target.value})} style={{width:'100%',padding:'8px',border:'1px solid #d1d5db',borderRadius:'6px'}}>
                  <option value="">Select loan</option>
                  {loans.map((l: any) => (
                    <option key={l.id} value={l.id}>Loan #{l.id} - {l.customer_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{display:'block',marginBottom:'4px',fontSize:'0.875rem'}}>Amount (KSh)</label>
                <input type="number" value={form.amount} onChange={(e) => setForm({...form, amount: e.target.value})} style={{width:'100%',padding:'8px',border:'1px solid #d1d5db',borderRadius:'6px',boxSizing:'border-box'}} placeholder="4667" />
              </div>
              <div>
                <label style={{display:'block',marginBottom:'4px',fontSize:'0.875rem'}}>Transaction Code</label>
                <input value={form.transaction_code} onChange={(e) => setForm({...form, transaction_code: e.target.value})} style={{width:'100%',padding:'8px',border:'1px solid #d1d5db',borderRadius:'6px',boxSizing:'border-box'}} placeholder="QWE123456" />
              </div>
              <div>
                <label style={{display:'block',marginBottom:'4px',fontSize:'0.875rem'}}>Source</label>
                <select value={form.source} onChange={(e) => setForm({...form, source: e.target.value})} style={{width:'100%',padding:'8px',border:'1px solid #d1d5db',borderRadius:'6px'}}>
                  <option value="mpesa">M-Pesa</option>
                  <option value="kcb_paybill">KCB Paybill</option>
                  <option value="bank">Bank Transfer</option>
                  <option value="cash">Cash</option>
                </select>
              </div>
            </div>
            <button onClick={handleSubmit} disabled={loading} style={{marginTop:'1rem',background:'#16a34a',color:'white',border:'none',padding:'8px 24px',borderRadius:'6px',cursor:'pointer'}}>
              {loading ? 'Saving...' : 'Record Payment'}
            </button>
          </div>
        )}
        <div style={{background:'white',borderRadius:'8px',boxShadow:'0 1px 3px rgba(0,0,0,0.1)'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.875rem'}}>
            <thead>
              <tr style={{borderBottom:'1px solid #e5e7eb',color:'#6b7280',textAlign:'left'}}>
                <th style={{padding:'12px'}}>Customer</th>
                <th style={{padding:'12px'}}>Amount</th>
                <th style={{padding:'12px'}}>Transaction Code</th>
                <th style={{padding:'12px'}}>Source</th>
                <th style={{padding:'12px'}}>Phone</th>
                <th style={{padding:'12px'}}>Date</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p: any) => (
                <tr key={p.id} style={{borderBottom:'1px solid #f3f4f6'}}>
                  <td style={{padding:'12px',fontWeight:'500'}}>{p.customer_name}</td>
                  <td style={{padding:'12px',color:'#16a34a',fontWeight:'500'}}>KSh {parseFloat(p.amount).toLocaleString()}</td>
                  <td style={{padding:'12px'}}>{p.transaction_code}</td>
                  <td style={{padding:'12px'}}>{p.source}</td>
                  <td style={{padding:'12px'}}>{p.phone_number || '-'}</td>
                  <td style={{padding:'12px'}}>{new Date(p.payment_date).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}