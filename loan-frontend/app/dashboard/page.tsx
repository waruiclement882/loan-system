'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loans, setLoans] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    const h = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token };
    const base = 'https://loan-system-h794.onrender.com';
    fetch(base + '/api/customers', { headers: h }).then(r => r.json()).then(d => setCustomers(Array.isArray(d) ? d : []));
    fetch(base + '/api/loans', { headers: h }).then(r => r.json()).then(d => setLoans(Array.isArray(d) ? d : []));
    fetch(base + '/api/payments', { headers: h }).then(r => r.json()).then(d => setPayments(Array.isArray(d) ? d : []));
  }, []);

  const logout = () => { localStorage.clear(); router.push('/login'); };

  const totalDisbursed = loans.reduce((s, l) => s + parseFloat(l.amount || 0), 0);
  const totalRepayment = loans.reduce((s, l) => s + parseFloat(l.total_repayment || 0), 0);
  const totalCollected = payments.reduce((s, p) => s + parseFloat(p.amount || 0), 0);
  const totalOutstanding = loans.reduce((s, l) => s + (parseFloat(l.balance) || parseFloat(l.total_repayment) || 0), 0);
  const activeLoans = loans.filter(l => l.status === 'active').length;
  const paidLoans = loans.filter(l => l.status === 'paid').length;

  return (
    <div style={{minHeight:'100vh',background:'#f3f4f6'}}>
      <nav style={{background:'white',padding:'1rem 1.5rem',display:'flex',justifyContent:'space-between',alignItems:'center',boxShadow:'0 1px 3px rgba(0,0,0,0.1)'}}>
        <h1 style={{color:'#2563eb',fontWeight:'bold',fontSize:'1.25rem'}}>Microfinance System</h1>
        <div style={{display:'flex',gap:'1rem'}}>
          <button onClick={() => router.push('/customers')} style={{background:'none',border:'none',cursor:'pointer',color:'#374151'}}>Customers</button>
          <button onClick={() => router.push('/loans')} style={{background:'none',border:'none',cursor:'pointer',color:'#374151'}}>Loans</button>
          <button onClick={() => router.push('/payments')} style={{background:'none',border:'none',cursor:'pointer',color:'#374151'}}>Payments</button>
          <button onClick={logout} style={{background:'none',border:'none',cursor:'pointer',color:'red'}}>Logout</button>
        </div>
      </nav>
      <div style={{padding:'1.5rem'}}>
        <h2 style={{fontSize:'1.5rem',fontWeight:'bold',marginBottom:'1.5rem'}}>Dashboard</h2>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'1rem',marginBottom:'1.5rem'}}>
          <div style={{background:'white',borderRadius:'8px',padding:'1rem',boxShadow:'0 1px 3px rgba(0,0,0,0.1)'}}>
            <p style={{color:'#6b7280',fontSize:'0.875rem',margin:0}}>Total Customers</p>
            <p style={{fontSize:'2rem',fontWeight:'bold',color:'#2563eb',margin:'4px 0 0'}}>{customers.length}</p>
          </div>
          <div style={{background:'white',borderRadius:'8px',padding:'1rem',boxShadow:'0 1px 3px rgba(0,0,0,0.1)'}}>
            <p style={{color:'#6b7280',fontSize:'0.875rem',margin:0}}>Active Loans</p>
            <p style={{fontSize:'2rem',fontWeight:'bold',color:'#ea580c',margin:'4px 0 0'}}>{activeLoans}</p>
            <p style={{fontSize:'0.75rem',color:'#16a34a',margin:'2px 0 0'}}>{paidLoans} fully paid</p>
          </div>
          <div style={{background:'white',borderRadius:'8px',padding:'1rem',boxShadow:'0 1px 3px rgba(0,0,0,0.1)'}}>
            <p style={{color:'#6b7280',fontSize:'0.875rem',margin:0}}>Total Disbursed</p>
            <p style={{fontSize:'1.5rem',fontWeight:'bold',color:'#7c3aed',margin:'4px 0 0'}}>KSh {totalDisbursed.toLocaleString()}</p>
            <p style={{fontSize:'0.75rem',color:'#6b7280',margin:'2px 0 0'}}>Total repayable: KSh {totalRepayment.toLocaleString()}</p>
          </div>
          <div style={{background:'white',borderRadius:'8px',padding:'1rem',boxShadow:'0 1px 3px rgba(0,0,0,0.1)'}}>
            <p style={{color:'#6b7280',fontSize:'0.875rem',margin:0}}>Total Collected</p>
            <p style={{fontSize:'1.5rem',fontWeight:'bold',color:'#16a34a',margin:'4px 0 0'}}>KSh {totalCollected.toLocaleString()}</p>
            <p style={{fontSize:'0.75rem',color:'#dc2626',margin:'2px 0 0'}}>Outstanding: KSh {totalOutstanding.toLocaleString()}</p>
          </div>
        </div>
        <div style={{background:'white',borderRadius:'8px',padding:'1rem',boxShadow:'0 1px 3px rgba(0,0,0,0.1)',marginBottom:'1.5rem'}}>
          <h3 style={{fontWeight:'bold',marginBottom:'1rem'}}>Loans Overview</h3>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.875rem'}}>
            <thead>
              <tr style={{borderBottom:'1px solid #e5e7eb',color:'#6b7280',textAlign:'left'}}>
                <th style={{padding:'8px'}}>Customer</th>
                <th style={{padding:'8px'}}>Amount</th>
                <th style={{padding:'8px'}}>Monthly</th>
                <th style={{padding:'8px'}}>Balance</th>
                <th style={{padding:'8px'}}>Collected</th>
                <th style={{padding:'8px'}}>Status</th>
              </tr>
            </thead>
            <tbody>
              {loans.map((loan: any) => {
                const balance = parseFloat(loan.balance) || parseFloat(loan.total_repayment) || 0;
                const total = parseFloat(loan.total_repayment) || 0;
                const collected = total - balance;
                return (
                  <tr key={loan.id} style={{borderBottom:'1px solid #f3f4f6'}}>
                    <td style={{padding:'8px',fontWeight:'500'}}>{loan.customer_name}</td>
                    <td style={{padding:'8px'}}>KSh {parseFloat(loan.amount).toLocaleString()}</td>
                    <td style={{padding:'8px'}}>KSh {parseFloat(loan.monthly_payment).toLocaleString()}</td>
                    <td style={{padding:'8px',color:'#dc2626'}}>KSh {balance.toLocaleString()}</td>
                    <td style={{padding:'8px',color:'#16a34a'}}>KSh {collected.toLocaleString()}</td>
                    <td style={{padding:'8px'}}>
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
        <div style={{background:'white',borderRadius:'8px',padding:'1rem',boxShadow:'0 1px 3px rgba(0,0,0,0.1)'}}>
          <h3 style={{fontWeight:'bold',marginBottom:'1rem'}}>Recent Payments</h3>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.875rem'}}>
            <thead>
              <tr style={{borderBottom:'1px solid #e5e7eb',color:'#6b7280',textAlign:'left'}}>
                <th style={{padding:'8px'}}>Customer</th>
                <th style={{padding:'8px'}}>Amount</th>
                <th style={{padding:'8px'}}>Source</th>
                <th style={{padding:'8px'}}>Date</th>
              </tr>
            </thead>
            <tbody>
              {payments.slice(0,5).map((p: any) => (
                <tr key={p.id} style={{borderBottom:'1px solid #f3f4f6'}}>
                  <td style={{padding:'8px'}}>{p.customer_name}</td>
                  <td style={{padding:'8px',color:'#16a34a',fontWeight:'500'}}>KSh {parseFloat(p.amount).toLocaleString()}</td>
                  <td style={{padding:'8px'}}>{p.source}</td>
                  <td style={{padding:'8px'}}>{new Date(p.payment_date).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}