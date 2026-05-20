import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../App';
import { CATEGORY_META, MONTHS_TH, SECTION_COLORS, calcAchievement, achievementColor, formatValue } from '../config';
import { getKPIItems, getTargets, getActuals, buildMaps, getItemMonthly, getItemYTD } from '../services/kpiService';
import { getOEEByYear } from '../services/oeeService';
import MonthlyChart from '../components/MonthlyChart';
import GaugeRing from '../components/GaugeRing';

export default function CategoryPage() {
  const { cat }  = useParams();
  const { year } = useApp();
  const navigate = useNavigate();
  const meta = CATEGORY_META[cat];

  const [items, setItems]     = useState([]);
  const [maps, setMaps]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [oeeError, setOeeError] = useState(null);
  const [activeId, setActiveId] = useState(null);

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
    ]).then(([all, targets, actuals, oeeData]) => {
      const ci = all.filter(i => i.category === cat);
      setItems(ci);
      setMaps(buildMaps(all, targets, actuals, oeeData));
      if (ci.length) setActiveId(ci[0].id);
      setLoading(false);
    });
  }, [year, cat]);

  if (!meta) return <div className="page-content" style={{ color: 'var(--muted)' }}>ไม่พบหมวดหมู่</div>;
  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--muted)' }}>กำลังโหลด...</div>;

  const active = items.find(i => i.id === activeId);
  const monthly = active && maps ? getItemMonthly(active, maps.targetMap, maps.actualMap) : [];
  const ytd = active && maps ? getItemYTD(active, maps.targetMap, maps.actualMap) : {};
  const ytdPct = active ? calcAchievement(active, ytd.actual, ytd.target) : null;

  // group by section
  const sections = [...new Set(items.map(i => i.section))];

  return (
    <div className="page-content">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button
          onClick={() => navigate('/')}
          style={{ background: 'var(--bg3)', border: '1px solid var(--border2)', color: 'var(--text2)', borderRadius: 8, padding: '6px 12px', fontSize: 13 }}
        >
          ← กลับ
        </button>
        <span style={{ fontSize: 20 }}>{meta.icon}</span>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20, color: meta.color }}>{meta.label}</h1>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>ปีงบประมาณ {year}</div>
        </div>
      </div>

      {oeeError && (
        <div style={{ marginBottom: 14, fontSize: 12, color: 'var(--amber)', background: 'rgba(245,158,11,0.1)', padding: '8px 14px', borderRadius: 8 }}>
          ⚠️ {oeeError}
        </div>
      )}

      {/* Item tabs grouped by section */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {sections.map(sec => (
          <div key={sec} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: SECTION_COLORS[sec] ?? 'var(--muted)', marginRight: 2, fontWeight: 700 }}>{sec}</span>
            {items.filter(i => i.section === sec).map(item => (
              <button
                key={item.id}
                onClick={() => setActiveId(item.id)}
                style={{
                  padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                  border: `1px solid ${activeId === item.id ? meta.color : 'var(--border2)'}`,
                  background: activeId === item.id ? `${meta.color}18` : 'var(--bg3)',
                  color: activeId === item.id ? meta.color : 'var(--text2)',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}
              >
                {item.name_en}
                {item.source === 'gsheet' && <span style={{ fontSize: 9, opacity: 0.6 }}>🔗</span>}
              </button>
            ))}
          </div>
        ))}
      </div>

      {active && (
        <>
          {/* YTD card */}
          <div className="card" style={{ padding: 20, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
            <GaugeRing pct={ytdPct} size={100} />
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
                  background: `${SECTION_COLORS[active.section]}22`,
                  color: SECTION_COLORS[active.section] ?? 'var(--muted)',
                  border: `1px solid ${SECTION_COLORS[active.section]}44`,
                }}>{active.section}</span>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>Champion: {active.champion}</span>
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 26, color: achievementColor(ytdPct) }}>
                {formatValue(active, ytd.actual)}
              </div>
              {ytd.target != null && (
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                  Target: {formatValue(active, ytd.target)} &nbsp;&middot;&nbsp; Commitment: {active.commitment}
                </div>
              )}
              {active.source === 'gsheet' && (
                <div style={{ fontSize: 11, color: 'var(--blue)', marginTop: 4 }}>🔗 ดึงจาก Google Sheet อัตโนมัติ</div>
              )}
            </div>
          </div>

          {/* Monthly chart */}
          <div className="card" style={{ padding: 20, marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)', marginBottom: 12 }}>
              Actual vs Target รายเดือน
            </div>
            <MonthlyChart
              data={monthly}
              color={meta.color}
              unit={active.unit ?? ''}
              lowerBetter={active.lower_better}
            />
          </div>

          {/* Monthly table */}
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
                {monthly.map((d, i) => {
                  const pct = calcAchievement(active, d.actual, d.target);
                  const clr = achievementColor(pct);
                  return (
                    <tr key={i}>
                      <td style={{ color: 'var(--text2)' }}>{MONTHS_TH[i]}</td>
                      <td style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                        {d.actual != null ? formatValue(active, d.actual) : <span style={{ color: 'var(--muted)' }}>—</span>}
                      </td>
                      <td style={{ color: 'var(--muted)' }}>
                        {d.target != null ? formatValue(active, d.target) : '—'}
                      </td>
                      <td>
                        {pct != null
                          ? <span style={{ color: clr, fontWeight: 700, fontFamily: 'var(--font-display)' }}>{Math.round(pct)}%</span>
                          : <span style={{ color: 'var(--muted)' }}>—</span>}
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
