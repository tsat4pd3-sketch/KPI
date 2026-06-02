import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useApp } from '../App';

const NAV = [
  { to: '/dashboard', icon: '📊', label: 'Dashboard' },
  { to: '/trends',  icon: '📈', label: 'แนวโน้ม KPI' },
  { to: '/entry',   icon: '📝', label: 'กรอกข้อมูล' },
  { to: '/targets', icon: '🎯', label: 'ตั้งค่าเป้าหมาย' },
  { to: '/gamesim', icon: '🎮', label: 'Agent Sim' },
  { to: '/agentsetup', icon: '⚙️', label: 'Agent Setup' },
];

const SB = {
  bg:     '#0d3d14',
  hover:  'rgba(255,255,255,0.08)',
  active: 'rgba(255,255,255,0.13)',
  border: 'rgba(255,255,255,0.12)',
  text:   '#ffffff',
  muted:  'rgba(255,255,255,0.52)',
  orange: '#e87c1e',
};

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
    navigate('/');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'fixed', top: 14, left: open ? W + 10 : 14, zIndex: 1100,
          width: 34, height: 34, borderRadius: 6,
          background: open ? 'rgba(255,255,255,0.15)' : 'var(--bg3)',
          border: open ? '1px solid rgba(255,255,255,0.2)' : '1px solid var(--border2)',
          color: open ? '#fff' : 'var(--text2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
          transition: 'left 0.3s cubic-bezier(0.4,0,0.2,1)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        {open ? '✕' : '☰'}
      </button>

      {isMobile && open && (
        <div onClick={() => setOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 990 }}/>
      )}

      <nav style={{
        position: 'fixed', top: 0, left: 0, height: '100vh',
        width: open ? W : 0,
        background: SB.bg,
        display: 'flex', flexDirection: 'column',
        padding: open ? '0 10px 20px' : 0,
        overflow: 'hidden',
        transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1)',
        zIndex: 1000,
      }}>
        <div style={{ padding: '20px 6px 16px', borderBottom: `1px solid ${SB.border}`, marginBottom: 10, whiteSpace: 'nowrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 5 }}>
            <div style={{ width: 30, height: 30, background: SB.orange, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="14" height="13" viewBox="0 0 14 13" fill="none">
                <path d="M7 1L13 12H1L7 1Z" fill="rgba(255,255,255,0.95)"/>
                <path d="M7 5L10 12H4L7 5Z" fill={SB.orange}/>
              </svg>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 13, color: SB.text, lineHeight: 1.15, letterSpacing: '0.06em' }}>THAI SUMMIT</div>
              <div style={{ fontSize: 9, color: SB.muted, letterSpacing: '0.14em', textTransform: 'uppercase' }}>GROUP VX</div>
            </div>
          </div>
          <div style={{ fontSize: 9, color: SB.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginLeft: 39 }}>KPI · BALANCED SCORECARD</div>
        </div>

        <div style={{ padding: '8px 6px 14px', borderBottom: `1px solid ${SB.border}`, marginBottom: 8, whiteSpace: 'nowrap' }}>
          <div style={{ fontSize: 9, color: SB.muted, marginBottom: 5, letterSpacing: '0.1em', textTransform: 'uppercase' }}>ปีงบประมาณ</div>
          <select value={year} onChange={e => setYear(+e.target.value)} style={{
            fontSize: 14, fontWeight: 700, padding: '6px 10px',
            background: 'rgba(255,255,255,0.1)', color: SB.text,
            border: `1px solid ${SB.border}`, borderRadius: 4, width: '100%',
          }}>
            {[2024,2025,2026,2027].map(y => (
              <option key={y} value={y} style={{ background: SB.bg, color: SB.text }}>{y}</option>
            ))}
          </select>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
          {NAV.map(({ to, icon, label }) => {
            const isActive = location.pathname === to;
            return (
              <Link key={to} to={to}
                onClick={() => isMobile && setOpen(false)}
                style={{
                  color: isActive ? SB.text : SB.muted,
                  textDecoration: 'none', padding: '10px 12px', borderRadius: 5,
                  display: 'flex', alignItems: 'center', gap: 10,
                  fontSize: 13, fontWeight: isActive ? 700 : 500,
                  background: isActive ? SB.active : 'transparent',
                  borderLeft: isActive ? `3px solid ${SB.orange}` : '3px solid transparent',
                  transition: 'background 0.15s, color 0.15s',
                  whiteSpace: 'nowrap', cursor: 'pointer',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = SB.hover; e.currentTarget.style.color = SB.text; }}
                onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = SB.muted; } }}
              >
                <span style={{ fontSize: 15, flexShrink: 0 }}>{icon}</span>
                <span>{label}</span>
              </Link>
            );
          })}
        </div>

        <div style={{ borderTop: `1px solid ${SB.border}`, paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <button onClick={toggleTheme} style={{
            background: 'transparent', border: 'none', width: '100%', textAlign: 'left',
            color: SB.muted, padding: '9px 12px', borderRadius: 5, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 10, fontSize: 12,
          }}
            onMouseEnter={e => { e.currentTarget.style.background = SB.hover; e.currentTarget.style.color = SB.text; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = SB.muted; }}
          >
            <span style={{ fontSize: 14 }}>{theme === 'dark' ? '☀️' : '🌙'}</span>
            <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
          <button onClick={logout} style={{
            background: 'transparent', border: 'none', width: '100%', textAlign: 'left',
            color: 'rgba(255,120,80,0.75)', padding: '9px 12px', borderRadius: 5, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 10, fontSize: 12,
          }}
            onMouseEnter={e => { e.currentTarget.style.background = SB.hover; e.currentTarget.style.color = '#ff8060'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,120,80,0.75)'; }}
          >
            <span style={{ fontSize: 14 }}>🚪</span>
            <span>ออกจากระบบ</span>
          </button>
        </div>
      </nav>

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
