'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://loan-system-h794.onrender.com';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [companyName, setCompanyName] = useState('Blessed Ventures');
  const [tagline, setTagline] = useState('Sign in to your account');
  const [logoUrl, setLogoUrl] = useState('');
  const [lampOn, setLampOn] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [swinging, setSwinging] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetch(`${API}/api/settings`)
      .then(r => r.json())
      .then(d => {
        if (d.company_name) setCompanyName(d.company_name);
        if (d.tagline) setTagline(d.tagline);
        if (d.logo_url) setLogoUrl(d.logo_url);
      }).catch(() => {});
  }, []);

  const toggleLamp = () => {
    setSwinging(true);
    setTimeout(() => {
      setLampOn(prev => !prev);
      setSwinging(false);
    }, 200);
  };

  const handleLogin = async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        router.push('/dashboard');
      } else {
        setError(data.error || 'Login failed');
      }
    } catch {
      setError('Connection failed. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: lampOn
        ? 'radial-gradient(ellipse at 30% 40%, #2a1f0a 0%, #1c1408 40%, #0e0b04 100%)'
        : 'radial-gradient(ellipse at 50% 50%, #0d1a0f 0%, #080e09 60%, #040704 100%)',
      transition: 'background 0.8s ease',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden',
    }}>

      {lampOn && (
        <div style={{
          position: 'absolute', bottom: 0, left: '18%',
          width: 320, height: 220,
          background: 'radial-gradient(ellipse at 50% 100%, rgba(255,200,80,0.18) 0%, transparent 70%)',
          pointerEvents: 'none', animation: 'glowIn 0.6s ease forwards',
        }} />
      )}

      {lampOn && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: 'radial-gradient(ellipse at 28% 45%, rgba(255,180,40,0.06) 0%, transparent 55%)',
          pointerEvents: 'none', animation: 'glowIn 0.8s ease forwards',
        }} />
      )}

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 60, width: '100%', maxWidth: 900, flexWrap: 'wrap',
      }}>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>

          {lampOn && (
            <div style={{
              position: 'absolute', top: 30, left: '50%', transform: 'translateX(-50%)',
              width: 200, height: 200, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,210,80,0.35) 0%, transparent 70%)',
              animation: 'glowIn 0.5s ease forwards', pointerEvents: 'none',
            }} />
          )}

          <svg width="180" height="280" viewBox="0 0 180 280" fill="none"
            style={{ filter: lampOn ? 'drop-shadow(0 0 24px rgba(255,200,60,0.5))' : 'none', transition: 'filter 0.6s ease' }}>
            <ellipse cx="90" cy="72" rx="68" ry="18"
              fill={lampOn ? '#f0d060' : '#3a3a3a'}
              style={{ transition: 'fill 0.6s ease' }} />
            <path d="M22 72 Q10 130 30 148 Q60 158 90 158 Q120 158 150 148 Q170 130 158 72 Z"
              fill={lampOn ? '#e8c840' : '#2e2e2e'}
              style={{ transition: 'fill 0.6s ease' }} />
            <ellipse cx="90" cy="148" rx="60" ry="14"
              fill={lampOn ? '#d4b030' : '#252525'}
              style={{ transition: 'fill 0.6s ease' }} />
            {lampOn && <ellipse cx="90" cy="148" rx="55" ry="10" fill="rgba(255,240,120,0.6)" />}
            <circle cx="90" cy="155" r="8"
              fill={lampOn ? '#fffde0' : '#1a1a1a'}
              style={{ transition: 'fill 0.4s ease' }} />
            <rect x="85" y="155" width="10" height="70" rx="5"
              fill={lampOn ? '#c8a820' : '#282828'}
              style={{ transition: 'fill 0.6s ease' }} />
            <rect x="82" y="220" width="16" height="30" rx="6"
              fill={lampOn ? '#b89818' : '#222222'}
              style={{ transition: 'fill 0.6s ease' }} />
            <ellipse cx="90" cy="252" rx="42" ry="10"
              fill={lampOn ? '#a08010' : '#1e1e1e'}
              style={{ transition: 'fill 0.6s ease' }} />
            <ellipse cx="90" cy="256" rx="38" ry="7"
              fill={lampOn ? '#8a6c08' : '#1a1a1a'}
              style={{ transition: 'fill 0.6s ease' }} />
            <line x1="90" y1="256" x2="90" y2="278"
              stroke={lampOn ? '#c8a820' : '#333'} strokeWidth="2.5"
              style={{ transition: 'stroke 0.6s ease' }} />
          </svg>

          <div style={{ position: 'relative', marginTop: -12, cursor: 'pointer' }} onClick={toggleLamp}>
            <div style={{
              width: 2, height: swinging ? 28 : 22,
              background: lampOn ? '#c8a820' : '#444',
              margin: '0 auto', borderRadius: 2,
              transition: 'height 0.15s ease, background 0.6s ease',
            }} />
            <div style={{
              width: 14, height: 14, borderRadius: '50%',
              background: lampOn
                ? 'radial-gradient(circle at 35% 35%, #ffe066, #c8a820)'
                : 'radial-gradient(circle at 35% 35%, #666, #333)',
              margin: '4px auto 0',
              boxShadow: lampOn ? '0 0 8px rgba(255,200,60,0.6)' : '0 2px 4px rgba(0,0,0,0.5)',
              transition: 'all 0.4s ease',
              animation: swinging ? 'ballSwing 0.3s ease' : 'none',
            }} />
            <p style={{
              color: lampOn ? 'rgba(255,200,60,0.6)' : 'rgba(255,255,255,0.2)',
              fontSize: 10, marginTop: 8, textAlign: 'center',
              letterSpacing: '0.08em', transition: 'color 0.6s ease', userSelect: 'none',
            }}>
              {lampOn ? 'click to dim' : 'click to light'}
            </p>
          </div>
        </div>

        <div style={{
          width: '100%', maxWidth: 360,
          opacity: mounted ? (lampOn ? 1 : 0.06) : 0,
          transform: lampOn ? 'translateY(0) scale(1)' : 'translateY(12px) scale(0.98)',
          transition: 'opacity 0.7s ease, transform 0.7s ease',
          pointerEvents: lampOn ? 'auto' : 'none',
        }}>
          <div style={{
            background: lampOn ? 'rgba(30,22,8,0.85)' : 'rgba(10,14,10,0.6)',
            backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
            border: `1px solid ${lampOn ? 'rgba(200,168,32,0.25)' : 'rgba(255,255,255,0.06)'}`,
            borderRadius: 20, padding: '36px 32px',
            boxShadow: lampOn
              ? '0 20px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,200,60,0.08)'
              : '0 20px 60px rgba(0,0,0,0.4)',
            transition: 'all 0.7s ease',
          }}>

            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" style={{ height: 48, objectFit: 'contain', margin: '0 auto 12px', display: 'block', filter: 'brightness(0) invert(1)', opacity: 0.85 }} />
              ) : (
                <div style={{
                  width: 48, height: 48, borderRadius: 14, margin: '0 auto 12px',
                  background: lampOn ? 'rgba(200,168,32,0.2)' : 'rgba(29,158,117,0.2)',
                  border: `1px solid ${lampOn ? 'rgba(200,168,32,0.3)' : 'rgba(29,158,117,0.3)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, transition: 'all 0.6s ease',
                }}>🏦</div>
              )}
              <h1 style={{ color: lampOn ? '#f0d060' : '#9FE1CB', fontSize: 20, fontWeight: 700, margin: 0, transition: 'color 0.6s ease' }}>
                {companyName}
              </h1>
              <p style={{ color: lampOn ? 'rgba(240,208,96,0.6)' : 'rgba(159,225,203,0.5)', fontSize: 12, marginTop: 4, transition: 'color 0.6s ease' }}>
                {tagline}
              </p>
            </div>

            {error && (
              <div style={{
                background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                color: '#fca5a5', padding: '10px 14px', borderRadius: 10, fontSize: 13, marginBottom: 16,
              }}>{error}</div>
            )}

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', color: lampOn ? 'rgba(240,208,96,0.7)' : 'rgba(159,225,203,0.7)', fontSize: 11, fontWeight: 600, marginBottom: 6, letterSpacing: '0.06em', textTransform: 'uppercase', transition: 'color 0.6s ease' }}>
                Email Address
              </label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                placeholder="you@example.com"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: 'rgba(255,255,255,0.06)',
                  border: `1px solid ${lampOn ? 'rgba(200,168,32,0.2)' : 'rgba(159,225,203,0.15)'}`,
                  borderRadius: 10, padding: '11px 13px', color: 'white', fontSize: 14, outline: 'none',
                  transition: 'border-color 0.3s',
                }}
                onFocus={e => { e.target.style.borderColor = lampOn ? 'rgba(200,168,32,0.6)' : 'rgba(159,225,203,0.5)'; }}
                onBlur={e => { e.target.style.borderColor = lampOn ? 'rgba(200,168,32,0.2)' : 'rgba(159,225,203,0.15)'; }}
              />
            </div>

            <div style={{ marginBottom: 22 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <label style={{ color: lampOn ? 'rgba(240,208,96,0.7)' : 'rgba(159,225,203,0.7)', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', transition: 'color 0.6s ease' }}>
                  Password
                </label>
                <button onClick={() => router.push('/forgot-password')}
                  style={{ color: lampOn ? 'rgba(240,208,96,0.5)' : 'rgba(159,225,203,0.5)', fontSize: 11, background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.6s ease' }}>
                  Forgot password?
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <input type={showPass ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  placeholder="••••••••"
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: 'rgba(255,255,255,0.06)',
                    border: `1px solid ${lampOn ? 'rgba(200,168,32,0.2)' : 'rgba(159,225,203,0.15)'}`,
                    borderRadius: 10, padding: '11px 40px 11px 13px', color: 'white', fontSize: 14, outline: 'none',
                    transition: 'border-color 0.3s',
                  }}
                  onFocus={e => { e.target.style.borderColor = lampOn ? 'rgba(200,168,32,0.6)' : 'rgba(159,225,203,0.5)'; }}
                  onBlur={e => { e.target.style.borderColor = lampOn ? 'rgba(200,168,32,0.2)' : 'rgba(159,225,203,0.15)'; }}
                />
                <button onClick={() => setShowPass(!showPass)}
                  style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', fontSize: 15 }}>
                  {showPass ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            <button onClick={handleLogin} disabled={loading}
              style={{
                width: '100%', padding: '13px', borderRadius: 11, border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: 14, fontWeight: 700,
                color: lampOn ? '#1a1200' : 'white',
                background: loading ? 'rgba(200,168,32,0.4)'
                  : lampOn ? 'linear-gradient(135deg, #f0d060 0%, #c8a820 100%)'
                  : 'linear-gradient(135deg, #1D9E75 0%, #0F6E56 100%)',
                boxShadow: loading ? 'none' : lampOn
                  ? '0 4px 20px rgba(200,168,32,0.4)'
                  : '0 4px 20px rgba(29,158,117,0.35)',
                transition: 'all 0.5s ease',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
              {loading ? (
                <>
                  <span style={{
                    width: 15, height: 15,
                    border: '2px solid rgba(0,0,0,0.2)', borderTopColor: '#1a1200',
                    borderRadius: '50%', display: 'inline-block',
                    animation: 'spin 0.7s linear infinite',
                  }} />
                  Signing in...
                </>
              ) : 'Sign In'}
            </button>

            <p style={{ textAlign: 'center', color: lampOn ? 'rgba(200,168,32,0.25)' : 'rgba(255,255,255,0.1)', fontSize: 10, marginTop: 20, transition: 'color 0.6s ease' }}>
              Blessed Ventures LTD © {new Date().getFullYear()}
            </p>
          </div>
        </div>

        {mounted && !lampOn && (
          <div style={{
            position: 'absolute', bottom: 40, left: '50%', transform: 'translateX(-50%)',
            color: 'rgba(255,255,255,0.2)', fontSize: 13, textAlign: 'center',
            animation: 'fadeHint 2s ease-in-out infinite', whiteSpace: 'nowrap',
          }}>
            💡 Pull the cord to turn on the lamp
          </div>
        )}
      </div>

      <style>{`
        @keyframes glowIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes ballSwing {
          0% { transform: translateX(0); }
          25% { transform: translateX(5px); }
          75% { transform: translateX(-5px); }
          100% { transform: translateX(0); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeHint {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
        input::placeholder { color: rgba(255,255,255,0.2); }
        input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 100px rgba(30,22,8,0.9) inset !important;
          -webkit-text-fill-color: white !important;
        }
      `}</style>
    </div>
  );
}