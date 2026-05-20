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
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        router.push('/dashboard');
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('Connection failed');
    }
    setLoading(false);
  };

  const roleColors: Record<string, string> = {
    admin: '#7c3aed',
    loan_officer: '#2563eb',
    cashier: '#059669',
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 50%, #0ea5e9 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '420px', overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>

        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #1e3a8a, #2563eb)', padding: '2rem', textAlign: 'center' }}>
          <div style={{ width: '64px', height: '64px', background: 'rgba(255,255,255,0.2)', borderRadius: '50%', margin: '0 auto 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>
            🏦
          </div>
          <h1 style={{ color: 'white', fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>Microfinance System</h1>
          <p style={{ color: 'rgba(255,255,255,0.75)', margin: '0.5rem 0 0', fontSize: '0.875rem' }}>Sign in to your account</p>
        </div>

        {/* Role badges */}
        <div style={{ display: 'flex', gap: '8px', padding: '1rem 2rem 0', justifyContent: 'center' }}>
          {['Admin', 'Loan Officer', 'Cashier'].map((role) => (
            <span key={role} style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '999px', background: role === 'Admin' ? '#ede9fe' : role === 'Loan Officer' ? '#dbeafe' : '#d1fae5', color: role === 'Admin' ? '#7c3aed' : role === 'Loan Officer' ? '#1d4ed8' : '#065f46', fontWeight: 600 }}>
              {role}
            </span>
          ))}
        </div>

        {/* Form */}
        <div style={{ padding: '1.5rem 2rem 2rem' }}>
          {error && (
            <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#dc2626', padding: '10px 14px', borderRadius: '8px', marginBottom: '1rem', fontSize: '14px', textAlign: 'center' }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              placeholder="you@example.com"
              style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #d1d5db', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              placeholder="••••••••"
              style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #d1d5db', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }}
            />
          </div>

          <button
            onClick={handleLogin}
            disabled={loading}
            style={{ width: '100%', padding: '12px', background: loading ? '#93c5fd' : 'linear-gradient(135deg, #1e3a8a, #2563eb)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Signing in...' : 'Sign In →'}
          </button>
        </div>
      </div>
    </div>
  );
}
