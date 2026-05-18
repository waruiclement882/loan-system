'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const handleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('https://loan-system-h794.onrender.com/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        router.push('/dashboard');
      } else { setError(data.error || 'Login failed'); }
    } catch (err) { setError('Connection failed'); }
    setLoading(false);
  };
  return (
    <div style={{minHeight:'100vh',background:'#f3f4f6',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{background:'white',padding:'2rem',borderRadius:'8px',width:'100%',maxWidth:'400px'}}>
        <h1 style={{textAlign:'center',fontSize:'1.5rem',fontWeight:'bold'}}>Microfinance System</h1>
        <p style={{textAlign:'center',color:'#6b7280',marginBottom:'1.5rem'}}>Sign in</p>
        {error && <p style={{color:'red',textAlign:'center'}}>{error}</p>}
        <div style={{marginBottom:'1rem'}}>
          <label>Email</label>
          <input type='email' value={email} onChange={(e) => setEmail(e.target.value)} placeholder='john@example.com' style={{width:'100%',padding:'8px',border:'1px solid #d1d5db',borderRadius:'6px',boxSizing:'border-box'}} />
        </div>
        <div style={{marginBottom:'1.5rem'}}>
          <label>Password</label>
          <input type='password' value={password} onChange={(e) => setPassword(e.target.value)} placeholder='password' style={{width:'100%',padding:'8px',border:'1px solid #d1d5db',borderRadius:'6px',boxSizing:'border-box'}} />
        </div>
        <button onClick={handleLogin} disabled={loading} style={{width:'100%',padding:'10px',background:'#2563eb',color:'white',border:'none',borderRadius:'6px',cursor:'pointer'}}>
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </div>
    </div>
  );
}
