import { useState, useEffect, createContext, useContext } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import Layout from './components/Layout';
import Login from './pages/Login';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import CategoryPage from './pages/CategoryPage';
import DataEntry from './pages/DataEntry';
import TargetSetting from './pages/TargetSetting';
import TrendPage from './pages/TrendPage';
import GameSim from './pages/GameSim';
import AgentSetup from './pages/AgentSetup';

export const AppCtx = createContext({});
export const useApp = () => useContext(AppCtx);

function ProtectedLayout({ session }) {
  if (!session) return <Navigate to="/login" replace />;
  return <Layout />;
}

export default function App() {
  const [session, setSession] = useState(undefined);
  const [year, setYear] = useState(new Date().getFullYear());
  const [theme, setTheme] = useState(() => localStorage.getItem('kpi-theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('kpi-theme', theme);
  }, [theme]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  if (session === undefined) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--muted)', fontFamily: 'var(--font-display)', fontSize: 14 }}>
      กำลังโหลด...
    </div>
  );

  const ctx = {
    year, setYear,
    theme,
    toggleTheme: () => setTheme(t => t === 'dark' ? 'light' : 'dark'),
    session,
  };

  return (
    <AppCtx.Provider value={ctx}>
      <HashRouter>
        <Routes>
          <Route path="/" element={session ? <Navigate to="/dashboard" replace /> : <LandingPage />} />
          <Route path="/login" element={session ? <Navigate to="/dashboard" replace /> : <Login />} />
          <Route element={<ProtectedLayout session={session} />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/category/:cat" element={<CategoryPage />} />
            <Route path="/entry" element={<DataEntry />} />
            <Route path="/targets" element={<TargetSetting />} />
            <Route path="/trends" element={<TrendPage />} />
            <Route path="/gamesim" element={<GameSim />} />
            <Route path="/agentsetup" element={<AgentSetup />} />
          </Route>
        </Routes>
      </HashRouter>
    </AppCtx.Provider>
  );
}
