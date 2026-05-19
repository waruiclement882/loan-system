'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoansPage() {
  const router = useRouter();
  const [loans, setLoans] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ customer_id: '', amount: '', interest_rate: '', term_months: '' });
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
    fetch(base + '/api/loans', { headers: h }).then(r => r.json()).then(d => setLoans(Array.isArray(d) ? d : []));
    fetch(base + '/api/customers', { headers: h }).then(r => r.json()).then(d => setCustomers(Array.isArray(d) ? d : []));
  };

  const handleSubmit = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    const h = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token };
    await fetch('https://loan-system-h794.onrender.com/api/loans', {
      method: 'POST', headers: h, body: JSON.stringify(form)
    });
    setForm({ customer_id: '', amount: '', interest_rate: '', term_months: '' });
    setShowForm(false);
    loadData();
    setLoading(false);
  };

  const getBalanceColor = (loan: any) => {
    const balance = parseFloat(loan.balance) || parseFloat(loan.total_repayment) || 0;
    const total = parseFloat(loan.total_repayment) || 0;
    const pct = total > 0 ? (balance / total) * 100 : 0;
    if (pct === 0) return '#16a34a';
    if (pct < 50) return '#ea580c';
    return '#dc2626';
  };

  return (
    <div style={{minHeight:'100vh',background:'#f3f4f6'}}>
      <nav style={{background:'white',padding:'1rem 1.5rem',display:'flex',justifyContent:'space-between',alignItems:'center',boxShadow:'0 1px 3px rgba(0,0,0,0.1)'}}>
        <h1 style={{color:'#2563eb',fontWeight:'bold',fontSize:'1.25rem'}}>Microfinance System</h1>
        <div style={{display:'flex',gap:'1rem'}}>
          <button onClick={() => router.push('/dashboard')} style={{background:'none',border:'none',cursor:'pointer',color:'#374151'}}>Dashboard</button>
          <button onClick={() => router.push('/customers')} style={{background:'none',border:'none',cursor:'pointer',color:'#374151'}}>Customers</button>
          <button onClick={() => router.push('/payments')} style={{background:'none',border:'none',cursor:'pointer',color:'#374151'}}>Payments</button>
        </div>
      </nav>
      <div style={{padding:'1.5rem'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1.5rem'}}>
          <h2 style={{fontSize:'1.5rem',fontWeight:'bold',margin:0}}>Loans</h2>
          <button onClick={() => setShowForm(!showForm)} style={{background:'#2563eb',color:'white',border:'none',padding:'8px 16px',borderRadius:'6px',cursor:'pointer'}}>+ New Loan</button>
        </div>
        {showForm && (
          <div style={{background:'white',borderRadius:'8px',padding:'1.5rem',marginBottom:'1.5rem',boxShadow:'0 1px 3px rgba(0,0,0,0.1)'}}>
            <h3 style={{fontWeight:'bold',marginBottom:'1rem'}}>New Loan</h3>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem'}}>
              <div>
                <label style={{display:'block',marginBottom:'4px',fontSize:'0.875rem'}}>Customer</label>
                <select value={form.customer_id} onChange={(e) => setForm({...form, customer_id: e.target.value})} style={{width:'100%',padding:'8px',border:'1px solid #d1d5db',borderRadius:'6px'}}>
                  <option value="">Select customer</option>
                  {customers.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{display:'block',marginBottom:'4px',fontSize:'0.875rem'}}>Amount (KSh)</label>
                <input type="number" value={form.amount} onChange={(e) => setForm({...form, amount: e.target.value})} style={{width:'100%',padding:'8px',border:'1px solid #d1d5db',borderRadius:'6px',boxSizing:'border-box'}} placeholder="50000" />
              </div>
              <div>
                <label style={{display:'block',marginBottom:'4px',fontSize:'0.875rem'}}>Interest Rate (%)</label>
                <input type="number" value={form.interest_rate} onChange={(e) => setForm({...form, interest_rate: e.target.value})} style={{width:'100%',padding:'8px',border:'1px solid #d1d5db',borderRadius:'6px',boxSizing:'border-box'}} placeholder="12" />
              </div>
              <div>
                <label style={{display:'block',marginBottom:'4px',fontSize:'0.875rem'}}>Term (Months)</label>
                <input type="number" value={form.term_months} onChange={(e) => setForm({...form, term_months: e.target.value})} style={{width:'100%',padding:'8px',border:'1px solid #d1d5db',borderRadius:'6px',boxSizing:'border-box'}} placeholder="12" />
              </div>
            </div>
            <button onClick={handleSubmit} disabled={loading} style={{marginTop:'1rem',background:'#16a34a',color:'white',border:'none',padding:'8px 24px',borderRadius:'6px',cursor:'pointer'}}>
              {loading ? 'Saving...' : 'Create Loan'}
            </button>
          </div>
        )}
        <div style={{background:'white',borderRadius:'8px',boxShadow:'0 1px 3px rgba(0,0,0,0.1)'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.875rem'}}>
            <thead>
              <tr style={{borderBottom:'1px solid #e5e7eb',color:'#6b7280',textAlign:'left'}}>
                <th style={{padding:'12px'}}>Customer</th>
                <th style={{padding:'12px'}}>Amount</th>
                <th style={{padding:'12px'}}>Interest</th>
                <th style={{padding:'12px'}}>Term</th>
                <th style={{padding:'12px'}}>Monthly</th>
                <th style={{padding:'12px'}}>Total</th>
                <th style={{padding:'12px'}}>Balance</th>
                <th style={{padding:'12px'}}>Status</th>
              </tr>
            </thead>
            <tbody>
              {loans.map((loan: any) => {
                const balance = parseFloat(loan.balance) || parseFloat(loan.total_repayment) || 0;
                const total = parseFloat(loan.total_repayment) || 0;
                const paid = total - balance;
                const pct = total > 0 ? Math.round((paid / total) * 100) : 0;
                return (
                  <tr key={loan.id} style={{borderBottom:'1px solid #f3f4f6'}}>
                    <td style={{padding:'12px',fontWeight:'500'}}>{loan.customer_name}</td>
                    <td style={{padding:'12px'}}>KSh {parseFloat(loan.amount).toLocaleString()}</td>
                    <td style={{padding:'12px'}}>{loan.interest_rate}%</td>
                    <td style={{padding:'12px'}}>{loan.term_months} mo</td>
                    <td style={{padding:'12px'}}>KSh {parseFloat(loan.monthly_payment).toLocaleString()}</td>
                    <td style={{padding:'12px'}}>KSh {total.toLocaleString()}</td>
                    <td style={{padding:'12px'}}>
                      <div style={{color:getBalanceColor(loan),fontWeight:'500'}}>KSh {balance.toLocaleString()}</div>
                      <div style={{background:'#e5e7eb',borderRadius:'9999px',height:'4px',marginTop:'4px'}}>
                        <div style={{background:'#16a34a',borderRadius:'9999px',height:'4px',width:pct+'%'}}></div>
                      </div>
                      <div style={{fontSize:'0.75rem',color:'#6b7280'}}>{pct}% paid</div>
                    </td>
                    <td style={{padding:'12px'}}>
                      <span style={{background: loan.status === 'paid' ? '#dcfce7' : loan.status === 'active' ? '#dbeafe' : '#fef9c3', color: loan.status === 'paid' ? '#15803d' : loan.status === 'active' ? '#1d4ed8' : '#854d0e', padding:'2px 8px',borderRadius:'9999px',fontSize:'0.75rem'}}>
                        {loan.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}