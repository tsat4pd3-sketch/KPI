import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../App';
import { CATEGORY_META, SECTIONS, SECTION_COLORS, calcAchievement, achievementColor, formatValue } from '../config';
import { getKPIItems, getTargets, getActuals, buildMaps, getItemYTD } from '../services/kpiService';
import { getOEEByYear } from '../services/oeeService';
import GaugeRing from '../components/GaugeRing';

const CATS = ['financial', 'customer', 'internal', 'growth'];

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
    ]).then(([items, targets, actuals, oeeData]) => {
      setItems(items);
      setMaps(buildMaps(items, targets, actuals, oeeData));
      setLoading(false);
    });
  }, [year]);

  const visibleItems = section === 'ALL'
    ? items
    : items.filter(i => i.section === section || i.section === 'ALL');

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--muted)' }}>
      กำลังโหลด...
    </div>
  );

  return (
    <div className="page-content">
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22 }}>KPI Dashboard</h1>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
          ปีงบประมาณ {year}
        </div>
        {oeeError && (
          <div style={{ marginTop: 8, fontSize: 12, color: 'var(--amber)', background: 'rgba(245,158,11,0.1)', padding: '6px 12px', borderRadius: 8, display: 'inline-block' }}>
            ⚠️ {oeeError}
          </div>
        )}
      </div>

      {/* Section Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {SECTIONS.map(s => (
          <button
            key={s}
            onClick={() => setSection(s)}
            style={{
              padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 700,
              border: `1px solid ${section === s ? SECTION_COLORS[s] : 'var(--border2)'}`,
              background: section === s ? `${SECTION_COLORS[s]}22` : 'var(--bg3)',
              color: section === s ? SECTION_COLORS[s] : 'var(--text2)',
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* 4 Category Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: 16 }}>
        {CATS.map(cat => {
          const meta = CATEGORY_META[cat];
          const catItems = visibleItems.filter(i => i.category === cat);
          const achievements = catItems
            .map(item => {
              if (!maps) return null;
              const { actual, target } = getItemYTD(item, maps.targetMap, maps.actualMap);
              return calcAchievement(item, actual, target);
            })
            .filter(v => v != null);
          const avgPct = achievements.length
            ? achievements.reduce((a, b) => a + b, 0) / achievements.length
            : null;

          return (
            <div
              key={cat}
              className="card"
              onClick={() => navigate(`/category/${cat}`)}
              style={{ cursor: 'pointer', overflow: 'hidden', transition: 'transform 0.15s, box-shadow 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 30px ${meta.color}25`; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
            >
              {/* Header */}
              <div style={{
                padding: '14px 18px',
                background: `linear-gradient(135deg, ${meta.color}18, ${meta.color}08)`,
                borderBottom: `1px solid ${meta.color}28`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 20 }}>{meta.icon}</span>
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: meta.color }}>{meta.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{meta.labelTH}</div>
                  </div>
                </div>
                <GaugeRing pct={avgPct} size={72} />
              </div>

              {/* Items */}
              <div style={{ padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 9 }}>
                {catItems.length === 0 && (
                  <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', padding: '8px 0' }}>—</div>
                )}
                {catItems.map(item => {
                  if (!maps) return null;
                  const { actual, target } = getItemYTD(item, maps.targetMap, maps.actualMap);
                  const pct = calcAchievement(item, actual, target);
                  const clr = achievementColor(pct);
                  return (
                    <div key={item.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: SECTION_COLORS[item.section] ?? 'var(--muted)', background: `${SECTION_COLORS[item.section]}18`, padding: '1px 5px', borderRadius: 4 }}>
                            {item.section}
                          </span>
                          <span style={{ fontSize: 12, color: 'var(--text2)' }}>{item.name_en}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          {actual != null && (
                            <span style={{ fontSize: 11, color: 'var(--muted)' }}>{formatValue(item, actual)}</span>
                          )}
                          {pct != null && (
                            <span style={{ fontSize: 12, fontWeight: 700, color: clr, fontFamily: 'var(--font-display)' }}>{Math.round(pct)}%</span>
                          )}
                          {actual == null && <span style={{ fontSize: 11, color: 'var(--muted)' }}>—</span>}
                        </div>
                      </div>
                      <div style={{ height: 3, background: 'var(--border2)', borderRadius: 2 }}>
                        <div style={{ height: '100%', width: `${pct ?? 0}%`, background: clr, borderRadius: 2, transition: 'width 0.6s ease' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ padding: '6px 18px 12px', textAlign: 'right' }}>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>ดูรายละเอียด →</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
