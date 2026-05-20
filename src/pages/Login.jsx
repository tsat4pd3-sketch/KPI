import { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function Login() {
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleLogin = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: 20,
    }}>
      <div className="card" style={{ width: 'min(380px, 100%)', padding: 36 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 28 }}>
            <span style={{ color: 'var(--accent)' }}>KPI</span>
            <span style={{ color: 'var(--text2)', fontWeight: 400, fontSize: 16, marginLeft: 8 }}>Dashboard</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4, letterSpacing: '0.1em' }}>BALANCED SCORECARD</div>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 5 }}>อีเมล</div>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com" required
            />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 5 }}>รหัสผ่าน</div>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" required
            />
          </div>
          {error && (
            <div style={{ fontSize: 13, color: 'var(--red)', background: 'rgba(231,76,60,0.1)', padding: '8px 12px', borderRadius: 8 }}>
              {error}
            </div>
          )}
          <button
            type="submit" disabled={loading}
            style={{
              marginTop: 4, padding: '11px 0', borderRadius: 8,
              background: 'var(--accent)', color: '#fff', border: 'none',
              fontWeight: 700, fontSize: 15, letterSpacing: '0.02em',
            }}
          >
            {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </button>
        </form>
      </div>
    </div>
  );
}
