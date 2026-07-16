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
  const [mounted, setMounted] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

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

  // Floating particles canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const particles: {
      x: number; y: number; r: number;
      vx: number; vy: number; opacity: number; pulse: number;
    }[] = Array.from({ length: 55 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 3 + 1,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      opacity: Math.random() * 0.5 + 0.1,
      pulse: Math.random() * Math.PI * 2,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw connection lines between nearby particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(159, 225, 203, ${(1 - dist / 120) * 0.15})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      particles.forEach(p => {
        p.pulse += 0.02;
        const pulsedR = p.r + Math.sin(p.pulse) * 0.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, pulsedR, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(159, 225, 203, ${p.opacity})`;
        ctx.fill();

        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
      });

      animRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animRef.current);
    };
  }, []);

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
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center"
      style={{ background: 'linear-gradient(135deg, #04342C 0%, #085041 40%, #0a6b55 70%, #04342C 100%)' }}>

      {/* Animated canvas background */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ opacity: 0.7 }} />

      {/* Glowing orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(29,158,117,0.15) 0%, transparent 70%)', animation: 'pulse 4s ease-in-out infinite' }} />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(15,110,86,0.2) 0%, transparent 70%)', animation: 'pulse 5s ease-in-out infinite 1s' }} />

      {/* Login card */}
      <div
        className="relative z-10 w-full max-w-sm mx-4"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(32px)',
          transition: 'opacity 0.7s ease, transform 0.7s ease',
        }}
      >
        {/* Glassmorphism card */}
        <div style={{
          background: 'rgba(255,255,255,0.07)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(159,225,203,0.2)',
          borderRadius: '24px',
          padding: '40px 36px',
          boxShadow: '0 25px 50px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
        }}>

          {/* Logo / brand */}
          <div className="text-center mb-8">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo"
                className="h-14 object-contain mx-auto mb-4"
                style={{ filter: 'brightness(0) invert(1)', opacity: 0.9 }} />
            ) : (
              <div className="mx-auto mb-4 w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(29,158,117,0.3)', border: '1px solid rgba(159,225,203,0.3)' }}>
                <span style={{ fontSize: 26 }}>🏦</span>
              </div>
            )}
            <h1 className="font-bold text-white" style={{ fontSize: 22, letterSpacing: '-0.3px' }}>
              {companyName}
            </h1>
            <p style={{ color: 'rgba(159,225,203,0.8)', fontSize: 13, marginTop: 4 }}>{tagline}</p>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.15)',
              border: '1px solid rgba(239,68,68,0.3)',
              color: '#fca5a5',
              padding: '10px 14px',
              borderRadius: 12,
              fontSize: 13,
              marginBottom: 16,
            }}>
              {error}
            </div>
          )}

          {/* Email */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', color: 'rgba(159,225,203,0.9)', fontSize: 12, fontWeight: 500, marginBottom: 6, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="you@example.com"
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(159,225,203,0.25)',
                borderRadius: 12,
                padding: '12px 14px',
                color: 'white',
                fontSize: 14,
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s, background 0.2s',
              }}
              onFocus={e => {
                e.target.style.borderColor = 'rgba(159,225,203,0.6)';
                e.target.style.background = 'rgba(255,255,255,0.12)';
              }}
              onBlur={e => {
                e.target.style.borderColor = 'rgba(159,225,203,0.25)';
                e.target.style.background = 'rgba(255,255,255,0.08)';
              }}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ color: 'rgba(159,225,203,0.9)', fontSize: 12, fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Password
              </label>
              <button onClick={() => router.push('/forgot-password')}
                style={{ color: 'rgba(159,225,203,0.7)', fontSize: 12, background: 'none', border: 'none', cursor: 'pointer' }}>
                Forgot password?
              </button>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(159,225,203,0.25)',
                  borderRadius: 12,
                  padding: '12px 44px 12px 14px',
                  color: 'white',
                  fontSize: 14,
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s, background 0.2s',
                }}
                onFocus={e => {
                  e.target.style.borderColor = 'rgba(159,225,203,0.6)';
                  e.target.style.background = 'rgba(255,255,255,0.12)';
                }}
                onBlur={e => {
                  e.target.style.borderColor = 'rgba(159,225,203,0.25)';
                  e.target.style.background = 'rgba(255,255,255,0.08)';
                }}
              />
              <button
                onClick={() => setShowPass(!showPass)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(159,225,203,0.6)', fontSize: 16 }}>
                {showPass ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          {/* Sign in button */}
          <button
            onClick={handleLogin}
            disabled={loading}
            style={{
              width: '100%',
              padding: '13px',
              borderRadius: 12,
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: 15,
              fontWeight: 600,
              color: 'white',
              background: loading
                ? 'rgba(29,158,117,0.5)'
                : 'linear-gradient(135deg, #1D9E75 0%, #0F6E56 100%)',
              boxShadow: loading ? 'none' : '0 4px 20px rgba(29,158,117,0.4)',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
            onMouseEnter={e => {
              if (!loading) {
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 24px rgba(29,158,117,0.5)';
              }
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 20px rgba(29,158,117,0.4)';
            }}
          >
            {loading ? (
              <>
                <span style={{
                  width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: 'white', borderRadius: '50%',
                  display: 'inline-block', animation: 'spin 0.7s linear infinite'
                }} />
                Signing in...
              </>
            ) : 'Sign In'}
          </button>

          {/* Footer */}
          <p style={{ textAlign: 'center', color: 'rgba(159,225,203,0.4)', fontSize: 11, marginTop: 24 }}>
            Secured · Blessed Ventures LTD © {new Date().getFullYear()}
          </p>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.08); opacity: 1; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        input::placeholder { color: rgba(159,225,203,0.3); }
      `}</style>
    </div>
  );
}
