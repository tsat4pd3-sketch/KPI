import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../App';
import { CATEGORY_META, SECTIONS, SECTION_COLORS, calcAchievement, achievementColor, formatValue } from '../config';
import { getKPIItems, getTargets, getActuals, buildMaps, getItemYTD } from '../services/kpiService';
import { getOEEByYear } from '../services/oeeService';
import GaugeRing from '../components/GaugeRing';

const CATS = ['financial', 'customer', 'internal', 'growth'];

function StatCard({ icon, label, value, sub, color, onClick }) {
  return (
    <div
      className="card"
      onClick={onClick}
      style={{
        padding: '18px 20px',
        borderLeft: `4px solid ${color}`,
        cursor: onClick ? 'pointer' : 'default',
        display: 'flex', alignItems: 'center', gap: 16,
        transition: 'transform 0.15s',
      }}
      onMouseEnter={e => onClick && (e.currentTarget.style.transform = 'translateY(-2px)')}
      onMouseLeave={e => onClick && (e.currentTarget.style.transform = '')}
    >
      <div style={{
        width: 48, height: 48, borderRadius: 12,
        background: `${color}20`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 22, flexShrink: 0,
      }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 }}>{label}</div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 30, color, lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>{sub}</div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { year } = useApp();
  const navigate = useNavigate();
  const [items, setItems]     = useState([]);
  const [maps, setMaps]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [oeeError, setOeeError] = useState(null);
  const [section, setSection] = useState('ALL');

  useEffect(() => {
    setLoading(true);
    setOeeError(null);
    Promise.all([
      getKPIItems(),
      getTargets(year),
      getActuals(year),
      getOEEByYear(year).catch(e => { setOeeError(e.message); return null; }),
    ]).then(([allItems, targets, actuals, oeeData]) => {
      setItems(allItems);
      setMaps(buildMaps(allItems, targets, actuals, oeeData));
      setLoading(false);
    });
  }, [year]);

  const visibleItems = section === 'ALL'
    ? items
    : items.filter(i => i.section === section || i.section === 'ALL');

  const itemsWithPct = visibleItems.map(item => {
    if (!maps) return { item, actual: null, target: null, pct: null };
    const { actual, target } = getItemYTD(item, maps.targetMap, maps.actualMap);
    return { item, actual, target, pct: calcAchievement(item, actual, target) };
  });

  const tracked  = itemsWithPct.filter(x => x.pct != null);
  const onTrack  = tracked.filter(x => x.pct >= 90).length;
  const atRisk   = tracked.filter(x => x.pct >= 70 && x.pct < 90).length;
  const below    = tracked.filter(x => x.pct < 70).length;
  const avgPct   = tracked.length
    ? Math.round(tracked.reduce((s, x) => s + x.pct, 0) / tracked.length)
    : null;

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--muted)' }}>
      กำลังโหลด...
    </div>
  );

  return (
    <div className="page-content">
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 24 }}>KPI Overview</h1>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>ปีงบประมาณ {year}</div>
        </div>
        {/* Section tabs */}
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
          {SECTIONS.map(s => (
            <button key={s} onClick={() => setSection(s)} style={{
              padding: '6px 16px', borderRadius: 20, fontSize: 12, fontWeight: 700,
              border: `1px solid ${section === s ? SECTION_COLORS[s] : 'var(--border2)'}`,
              background: section === s ? `${SECTION_COLORS[s]}22` : 'var(--bg3)',
              color: section === s ? SECTION_COLORS[s] : 'var(--text2)',
            }}>{s}</button>
          ))}
        </div>
      </div>

      {oeeError && (
        <div style={{ marginBottom: 14, fontSize: 12, color: 'var(--amber)', background: 'rgba(245,158,11,0.1)', padding: '8px 14px', borderRadius: 8 }}>
          ⚠️ {oeeError}
        </div>
      )}

      {/* ── Summary Stat Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
        <StatCard
          icon="📊"
          label="Overall Achievement"
          value={avgPct != null ? `${avgPct}%` : '—'}
          sub={`${tracked.length} ตัวชี้วัดที่มีข้อมูล`}
          color={avgPct != null ? achievementColor(avgPct) : 'var(--muted)'}
        />
        <StatCard
          icon="✅"
          label="On Track"
          value={onTrack}
          sub="Achievement ≥ 90%"
          color="#22c55e"
        />
        <StatCard
          icon="⚠️"
          label="At Risk"
          value={atRisk}
          sub="Achievement 70–89%"
          color="#f59e0b"
        />
        <StatCard
          icon="🔴"
          label="Below Target"
          value={below}
          sub="Achievement < 70%"
          color="#e74c3c"
        />
      </div>

      {/* ── Category Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14, marginBottom: 24 }}>
        {CATS.map(cat => {
          const meta = CATEGORY_META[cat];
          const catItems = visibleItems.filter(i => i.category === cat);
          const catPcts = catItems.map(item => {
            if (!maps) return null;
            const { actual, target } = getItemYTD(item, maps.targetMap, maps.actualMap);
            return calcAchievement(item, actual, target);
          }).filter(v => v != null);
          const avgCatPct = catPcts.length
            ? catPcts.reduce((a, b) => a + b, 0) / catPcts.length
            : null;

          return (
            <div key={cat} className="card"
              onClick={() => navigate(`/category/${cat}`)}
              style={{ cursor: 'pointer', overflow: 'hidden', transition: 'transform 0.15s, box-shadow 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 30px ${meta.color}25`; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
            >
              <div style={{
                padding: '12px 16px',
                background: `linear-gradient(135deg, ${meta.color}18, ${meta.color}06)`,
                borderBottom: `1px solid ${meta.color}28`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 18 }}>{meta.icon}</span>
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: meta.color }}>{meta.label}</div>
                    <div style={{ fontSize: 10, color: 'var(--muted)' }}>{meta.labelTH}</div>
                  </div>
                </div>
                <GaugeRing pct={avgCatPct} size={64} />
              </div>

              <div style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {catItems.length === 0 && (
                  <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', padding: '6px 0' }}>—</div>
                )}
                {catItems.map(item => {
                  if (!maps) return null;
                  const { actual, target } = getItemYTD(item, maps.targetMap, maps.actualMap);
                  const pct = calcAchievement(item, actual, target);
                  const clr = achievementColor(pct);
                  return (
                    <div key={item.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ fontSize: 9, fontWeight: 700, color: SECTION_COLORS[item.section] ?? 'var(--muted)', background: `${SECTION_COLORS[item.section]}18`, padding: '1px 5px', borderRadius: 3 }}>
                            {item.section}
                          </span>
                          <span style={{ fontSize: 11, color: 'var(--text2)' }}>{item.name_en}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                          {actual != null && <span style={{ fontSize: 10, color: 'var(--muted)' }}>{formatValue(item, actual)}</span>}
                          {pct != null
                            ? <span style={{ fontSize: 12, fontWeight: 700, color: clr, fontFamily: 'var(--font-display)' }}>{Math.round(pct)}%</span>
                            : <span style={{ fontSize: 10, color: 'var(--muted)' }}>—</span>}
                        </div>
                      </div>
                      <div style={{ height: 3, background: 'var(--border2)', borderRadius: 2 }}>
                        <div style={{ height: '100%', width: `${pct ?? 0}%`, background: clr, borderRadius: 2, transition: 'width 0.6s ease' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ padding: '4px 16px 10px', textAlign: 'right' }}>
                <span style={{ fontSize: 10, color: 'var(--muted)' }}>ดูรายละเอียด →</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── KPI Summary Table ── */}
      <div className="card" style={{ overflowX: 'auto' }}>
        <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text2)' }}>📋 สรุป KPI ทั้งหมด</span>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>{visibleItems.length} รายการ · คลิกเพื่อดูรายละเอียด</span>
        </div>
        <table>
          <thead>
            <tr>
              <th style={{ width: 52 }}>No.</th>
              <th>KPI</th>
              <th style={{ width: 64 }}>Section</th>
              <th style={{ width: 100 }}>Actual</th>
              <th style={{ width: 100 }}>Target</th>
              <th style={{ width: 150 }}>Achievement</th>
              <th style={{ width: 88 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {itemsWithPct.map(({ item, actual, target, pct }) => {
              const clr = achievementColor(pct);
              const status = pct == null ? null : pct >= 90 ? 'On Track' : pct >= 70 ? 'At Risk' : 'Below';
              const statusBg = pct == null ? null : pct >= 90 ? '#22c55e18' : pct >= 70 ? '#f59e0b18' : '#e74c3c18';
              return (
                <tr key={item.id} style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/category/${item.category}`)}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg2)'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}
                >
                  <td style={{ color: 'var(--muted)', fontSize: 11 }}>{item.kpi_no}</td>
                  <td>
                    <div style={{ fontWeight: 500, fontSize: 12 }}>{item.name_en}</div>
                    <div style={{ fontSize: 10, color: 'var(--muted)' }}>{item.commitment}</div>
                  </td>
                  <td>
                    <span style={{ fontSize: 10, fontWeight: 700, color: SECTION_COLORS[item.section] ?? 'var(--muted)', background: `${SECTION_COLORS[item.section] ?? '#888'}18`, padding: '2px 6px', borderRadius: 4 }}>
                      {item.section}
                    </span>
                  </td>
                  <td style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12 }}>
                    {actual != null ? formatValue(item, actual) : <span style={{ color: 'var(--muted)' }}>—</span>}
                  </td>
                  <td style={{ color: 'var(--muted)', fontSize: 12 }}>
                    {target != null ? formatValue(item, target) : '—'}
                  </td>
                  <td>
                    {pct != null ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 5, background: 'var(--border2)', borderRadius: 3 }}>
                          <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: clr, borderRadius: 3, transition: 'width 0.6s ease' }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: clr, fontFamily: 'var(--font-display)', minWidth: 36, textAlign: 'right' }}>
                          {Math.round(pct)}%
                        </span>
                      </div>
                    ) : <span style={{ color: 'var(--muted)', fontSize: 12 }}>—</span>}
                  </td>
                  <td>
                    {status && (
                      <span style={{ fontSize: 11, fontWeight: 600, color: clr, background: statusBg, padding: '3px 8px', borderRadius: 6 }}>
                        {status}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
