'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', national_id: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    const token = localStorage.getItem('token');
    const h = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token };
    fetch('https://loan-system-h794.onrender.com/api/customers', { headers: h })
      .then(r => r.json()).then(d => setCustomers(Array.isArray(d) ? d : []));
  };

  const handleSubmit = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    const h = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token };
    await fetch('https://loan-system-h794.onrender.com/api/customers', {
      method: 'POST', headers: h, body: JSON.stringify(form)
    });
    setForm({ name: '', email: '', phone: '', national_id: '' });
    setShowForm(false);
    loadCustomers();
    setLoading(false);
  };

  return (
    <div style={{minHeight:'100vh',background:'#f3f4f6'}}>
      <nav style={{background:'white',padding:'1rem 1.5rem',display:'flex',justifyContent:'space-between',alignItems:'center',boxShadow:'0 1px 3px rgba(0,0,0,0.1)'}}>
        <h1 style={{color:'#2563eb',fontWeight:'bold',fontSize:'1.25rem'}}>Microfinance System</h1>
        <div style={{display:'flex',gap:'1rem'}}>
          <button onClick={() => router.push('/dashboard')} style={{background:'none',border:'none',cursor:'pointer',color:'#374151'}}>Dashboard</button>
          <button onClick={() => router.push('/loans')} style={{background:'none',border:'none',cursor:'pointer',color:'#374151'}}>Loans</button>
          <button onClick={() => router.push('/payments')} style={{background:'none',border:'none',cursor:'pointer',color:'#374151'}}>Payments</button>
        </div>
      </nav>
      <div style={{padding:'1.5rem'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1.5rem'}}>
          <h2 style={{fontSize:'1.5rem',fontWeight:'bold',margin:0}}>Customers</h2>
          <button onClick={() => setShowForm(!showForm)} style={{background:'#2563eb',color:'white',border:'none',padding:'8px 16px',borderRadius:'6px',cursor:'pointer'}}>+ Add Customer</button>
        </div>
        {showForm && (
          <div style={{background:'white',borderRadius:'8px',padding:'1.5rem',marginBottom:'1.5rem',boxShadow:'0 1px 3px rgba(0,0,0,0.1)'}}>
            <h3 style={{fontWeight:'bold',marginBottom:'1rem'}}>New Customer</h3>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem'}}>
              <div>
                <label style={{display:'block',marginBottom:'4px',fontSize:'0.875rem'}}>Full Name</label>
                <input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} style={{width:'100%',padding:'8px',border:'1px solid #d1d5db',borderRadius:'6px',boxSizing:'border-box'}} placeholder="Alice Mwangi" />
              </div>
              <div>
                <label style={{display:'block',marginBottom:'4px',fontSize:'0.875rem'}}>Email</label>
                <input value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} style={{width:'100%',padding:'8px',border:'1px solid #d1d5db',borderRadius:'6px',boxSizing:'border-box'}} placeholder="alice@example.com" />
              </div>
              <div>
                <label style={{display:'block',marginBottom:'4px',fontSize:'0.875rem'}}>Phone</label>
                <input value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} style={{width:'100%',padding:'8px',border:'1px solid #d1d5db',borderRadius:'6px',boxSizing:'border-box'}} placeholder="0712345678" />
              </div>
              <div>
                <label style={{display:'block',marginBottom:'4px',fontSize:'0.875rem'}}>National ID</label>
                <input value={form.national_id} onChange={(e) => setForm({...form, national_id: e.target.value})} style={{width:'100%',padding:'8px',border:'1px solid #d1d5db',borderRadius:'6px',boxSizing:'border-box'}} placeholder="12345678" />
              </div>
            </div>
            <button onClick={handleSubmit} disabled={loading} style={{marginTop:'1rem',background:'#16a34a',color:'white',border:'none',padding:'8px 24px',borderRadius:'6px',cursor:'pointer'}}>
              {loading ? 'Saving...' : 'Save Customer'}
            </button>
          </div>
        )}
        <div style={{background:'white',borderRadius:'8px',boxShadow:'0 1px 3px rgba(0,0,0,0.1)'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.875rem'}}>
            <thead>
              <tr style={{borderBottom:'1px solid #e5e7eb',color:'#6b7280',textAlign:'left'}}>
                <th style={{padding:'12px'}}>Name</th>
                <th style={{padding:'12px'}}>Email</th>
                <th style={{padding:'12px'}}>Phone</th>
                <th style={{padding:'12px'}}>National ID</th>
                <th style={{padding:'12px'}}>Joined</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c: any) => (
                <tr key={c.id} style={{borderBottom:'1px solid #f3f4f6'}}>
                  <td style={{padding:'12px',fontWeight:'500'}}>{c.name}</td>
                  <td style={{padding:'12px'}}>{c.email}</td>
                  <td style={{padding:'12px'}}>{c.phone}</td>
                  <td style={{padding:'12px'}}>{c.national_id}</td>
                  <td style={{padding:'12px'}}>{new Date(c.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}