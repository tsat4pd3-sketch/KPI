import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useApp } from '../App';

const NAV = [
  { to: '/',        icon: '📊', label: 'Dashboard' },
  { to: '/trends',  icon: '📈', label: 'แนวโน้ม KPI' },
  { to: '/entry',   icon: '📝', label: 'กรอกข้อมูล' },
  { to: '/targets', icon: '🎯', label: 'ตั้งค่าเป้าหมาย' },
];

const W = 220;

export default function Layout() {
  const { year, setYear, theme, toggleTheme } = useApp();
  const [open, setOpen] = useState(window.innerWidth > 768);
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = window.innerWidth <= 768;

  useEffect(() => {
    const h = () => setOpen(window.innerWidth > 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Toggle button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'fixed', top: 14, left: open ? W + 10 : 14, zIndex: 1100,
          width: 34, height: 34, borderRadius: 8,
          background: 'var(--bg3)', border: '1px solid var(--border2)',
          color: 'var(--text2)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 15,
          transition: 'left 0.3s cubic-bezier(0.4,0,0.2,1)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        {open ? '✕' : '☰'}
      </button>

      {/* Mobile backdrop */}
      {isMobile && open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 990 }}
        />
      )}

      {/* Sidebar */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, height: '100vh',
        width: open ? W : 0,
        background: 'var(--bg2)',
        borderRight: open ? '1px solid var(--border)' : 'none',
        display: 'flex', flexDirection: 'column',
        padding: open ? '0 10px 20px' : 0,
        overflow: 'hidden',
        transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1)',
        zIndex: 1000,
      }}>
        {/* Brand header */}
        <div style={{ padding: '18px 6px 14px', borderBottom: '1px solid var(--border)', marginBottom: 10, whiteSpace: 'nowrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            {/* TSG triangle mark */}
            <div style={{ width: 28, height: 28, background: 'var(--accent)', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="14" height="13" viewBox="0 0 14 13" fill="none">
                <path d="M7 1L13 12H1L7 1Z" fill="rgba(255,255,255,0.9)"/>
                <path d="M7 5L10 12H4L7 5Z" fill="var(--accent)"/>
              </svg>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 13, color: 'var(--accent)', lineHeight: 1.1, letterSpacing: '0.04em' }}>
                THAI SUMMIT
              </div>
              <div style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>KPI Dashboard</div>
            </div>
          </div>
          <div style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginLeft: 36 }}>BALANCED SCORECARD</div>
        </div>

        {/* Year selector */}
        <div style={{ padding: '8px 6px 12px', whiteSpace: 'nowrap' }}>
          <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4, letterSpacing: '0.08em', textTransform: 'uppercase' }}>ปีงบประมาณ</div>
          <select
            value={year}
            onChange={e => setYear(+e.target.value)}
            style={{ fontSize: 14, fontWeight: 600, padding: '7px 10px' }}
          >
            {[2024, 2025, 2026, 2027].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {/* Navigation */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV.map(({ to, icon, label }) => (
            <Link
              key={to}
              to={to}
              className="nav-link"
              style={location.pathname === to
                ? { background: 'var(--accent-dim)', color: 'var(--accent)', borderLeft: '2px solid var(--accent)', fontWeight: 700 }
                : {}}
              onClick={() => isMobile && setOpen(false)}
            >
              <span style={{ fontSize: 15, flexShrink: 0 }}>{icon}</span>
              <span>{label}</span>
            </Link>
          ))}
        </div>

        {/* Footer */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <button
            onClick={toggleTheme}
            className="nav-link"
            style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left' }}
          >
            <span style={{ fontSize: 15 }}>{theme === 'dark' ? '☀️' : '🌙'}</span>
            <span style={{ color: 'var(--text2)' }}>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
          <button
            onClick={logout}
            className="nav-link"
            style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', color: '#ff6b6b' }}
          >
            <span style={{ fontSize: 15 }}>🚪</span>
            <span>ออกจากระบบ</span>
          </button>
        </div>
      </nav>

      {/* Main */}
      <main style={{
        flex: 1,
        marginLeft: !isMobile && open ? W : 0,
        minHeight: '100vh',
        paddingTop: 58,
        background: 'var(--bg)',
        transition: 'margin-left 0.3s cubic-bezier(0.4,0,0.2,1)',
        overflow: 'hidden',
      }}>
        <Outlet />
      </main>
    </div>
  );
}
