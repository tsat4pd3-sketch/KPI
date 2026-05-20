import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../App';
import { CATEGORY_META, MONTHS_TH, calcAchievement, achievementColor, isLowerBetter } from '../config';
import { getKPIItems, getTargets, getActuals, buildMaps, getItemMonthly } from '../services/kpiService';
import { getOEEByYear } from '../services/oeeService';
import MonthlyChart from '../components/MonthlyChart';
import GaugeRing from '../components/GaugeRing';

export default function CategoryPage() {
  const { cat }  = useParams();
  const { year } = useApp();
  const navigate = useNavigate();
  const meta = CATEGORY_META[cat];

  const [items, setItems]   = useState([]);
  const [maps, setMaps]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [oeeError, setOeeError] = useState(null);
  const [activeItem, setActiveItem] = useState(null);

  useEffect(() => {
    if (!meta) return;
    setLoading(true);
    Promise.all([
      getKPIItems(),
      getTargets(year),
      getActuals(year),
      cat === 'internal'
        ? getOEEByYear(year).catch(e => { setOeeError(e.message); return null; })
        : Promise.resolve(null),
    ]).then(([allItems, targets, actuals, oeeData]) => {
      const catItems = allItems.filter(i => i.category === cat);
      setItems(catItems);
      setMaps(buildMaps(allItems, targets, actuals, oeeData));
      if (catItems.length > 0) setActiveItem(catItems[0].id);
      setLoading(false);
    });
  }, [year, cat]);

  if (!meta) return <div className="page-content" style={{ color: 'var(--muted)' }}>ไม่พบหมวดหมู่นี้</div>;
  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--muted)' }}>กำลังโหลด...</div>;

  const active = items.find(i => i.id === activeItem);
  const monthlyData = active && maps ? getItemMonthly(active, maps.targetMap, maps.actualMap) : [];

  const ytdActuals = monthlyData.filter(d => d.actual != null);
  const ytdAvgActual = ytdActuals.length
    ? ytdActuals.reduce((s, d) => s + d.actual, 0) / ytdActuals.length
    : null;
  const ytdTarget = monthlyData.find(d => d.target != null)?.target ?? null;
  const ytdPct = active ? calcAchievement(active, ytdAvgActual, ytdTarget) : null;

  return (
    <div className="page-content">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'var(--bg3)', border: '1px solid var(--border2)',
            color: 'var(--text2)', borderRadius: 8, padding: '6px 12px',
            fontSize: 13, display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          ← กลับ
        </button>
        <span style={{ fontSize: 20 }}>{meta.icon}</span>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20, color: meta.color }}>
            {meta.label}
          </h1>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>ปีงบประมาณ {year}</div>
        </div>
      </div>

      {oeeError && (
        <div style={{ marginBottom: 16, fontSize: 12, color: 'var(--amber)', background: 'rgba(245,158,11,0.1)', padding: '8px 14px', borderRadius: 8 }}>
          ⚠️ {oeeError}
        </div>
      )}

      {/* KPI item tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {items.map(item => (
          <button
            key={item.id}
            onClick={() => setActiveItem(item.id)}
            style={{
              padding: '7px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600,
              border: `1px solid ${activeItem === item.id ? meta.color : 'var(--border2)'}`,
              background: activeItem === item.id ? `${meta.color}18` : 'var(--bg3)',
              color: activeItem === item.id ? meta.color : 'var(--text2)',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {item.name_th}
            {item.source === 'gsheet' && <span style={{ fontSize: 10, opacity: 0.7 }}>🔗</span>}
          </button>
        ))}
      </div>

      {active && (
        <>
          {/* YTD Overview */}
          <div className="card" style={{ padding: 20, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 24 }}>
            <GaugeRing pct={ytdPct} size={100} />
            <div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 4 }}>{active.name_th}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 28, color: achievementColor(ytdPct) }}>
                {ytdAvgActual != null
                  ? active.unit === '%' ? `${ytdAvgActual.toFixed(1)}%`
                  : active.unit === 'PPM' ? `${Math.round(ytdAvgActual)} PPM`
                  : ytdAvgActual.toLocaleString()
                  : '—'}
              </div>
              {ytdTarget != null && (
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                  เป้าหมาย: {active.unit === '%' ? `${ytdTarget}%` : ytdTarget.toLocaleString()} {active.unit}
                </div>
              )}
              {active.source === 'gsheet' && (
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>🔗 ดึงข้อมูลจาก Google Sheet อัตโนมัติ</div>
              )}
            </div>
          </div>

          {/* Monthly Chart */}
          <div className="card" style={{ padding: 20, marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)', marginBottom: 14 }}>Actual vs Target รายเดือน</div>
            <MonthlyChart
              data={monthlyData}
              color={meta.color}
              unit={active.unit ?? ''}
              lowerBetter={isLowerBetter(active)}
            />
          </div>

          {/* Monthly Table */}
          <div className="card" style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>เดือน</th>
                  <th>Actual</th>
                  <th>Target</th>
                  <th>Achievement</th>
                </tr>
              </thead>
              <tbody>
                {monthlyData.map((d, i) => {
                  const pct = calcAchievement(active, d.actual, d.target);
                  const color = achievementColor(pct);
                  return (
                    <tr key={i}>
                      <td style={{ color: 'var(--text2)' }}>{MONTHS_TH[i]}</td>
                      <td style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                        {d.actual != null
                          ? active.unit === '%' ? `${d.actual.toFixed(1)}%`
                          : active.unit === 'PPM' ? `${Math.round(d.actual)} PPM`
                          : d.actual.toLocaleString()
                          : <span style={{ color: 'var(--muted)' }}>—</span>}
                      </td>
                      <td style={{ color: 'var(--muted)' }}>
                        {d.target != null ? d.target.toLocaleString() : '—'}
                      </td>
                      <td>
                        {pct != null ? (
                          <span style={{ color, fontWeight: 700, fontFamily: 'var(--font-display)' }}>
                            {Math.round(pct)}%
                          </span>
                        ) : <span style={{ color: 'var(--muted)' }}>—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
