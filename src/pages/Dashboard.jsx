import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../App';
import { CATEGORY_META, calcAchievement, achievementColor } from '../config';
import { getKPIItems, getTargets, getActuals, buildMaps, getItemYTD } from '../services/kpiService';
import { getOEEByYear } from '../services/oeeService';
import GaugeRing from '../components/GaugeRing';

const CATS = ['financial', 'customer', 'internal', 'growth'];

export default function Dashboard() {
  const { year } = useApp();
  const navigate = useNavigate();
  const [items, setItems]   = useState([]);
  const [maps, setMaps]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [oeeError, setOeeError] = useState(null);

  useEffect(() => {
    setLoading(true);
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

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--muted)' }}>
      กำลังโหลด...
    </div>
  );

  const now = new Date();
  const month = now.getMonth() + 1;

  return (
    <div className="page-content">
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, color: 'var(--text)' }}>
          KPI Dashboard
        </h1>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
          ปีงบประมาณ {year} · อัปเดตล่าสุดเดือนที่ {month}
        </div>
        {oeeError && (
          <div style={{ marginTop: 8, fontSize: 12, color: 'var(--amber)', background: 'rgba(245,158,11,0.1)', padding: '6px 12px', borderRadius: 8, display: 'inline-block' }}>
            ⚠️ {oeeError}
          </div>
        )}
      </div>

      {/* 4 Category Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        {CATS.map(cat => {
          const meta  = CATEGORY_META[cat];
          const catItems = items.filter(i => i.category === cat);
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
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 30px ${meta.color}22`; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
            >
              {/* Card header */}
              <div style={{
                padding: '14px 18px',
                background: `linear-gradient(135deg, ${meta.color}18, ${meta.color}08)`,
                borderBottom: `1px solid ${meta.color}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 20 }}>{meta.icon}</span>
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: meta.color }}>
                      {meta.label}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{meta.labelTH}</div>
                  </div>
                </div>
                <GaugeRing pct={avgPct} size={72} />
              </div>

              {/* KPI items list */}
              <div style={{ padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {catItems.map(item => {
                  if (!maps) return null;
                  const { actual, target } = getItemYTD(item, maps.targetMap, maps.actualMap);
                  const pct = calcAchievement(item, actual, target);
                  const color = achievementColor(pct);

                  return (
                    <div key={item.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontSize: 13, color: 'var(--text2)' }}>{item.name_th}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {actual != null && (
                            <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                              {item.unit === '%' ? `${actual.toFixed(1)}%` :
                               item.unit === 'PPM' ? `${Math.round(actual)} PPM` :
                               actual.toLocaleString()}
                            </span>
                          )}
                          {pct != null && (
                            <span style={{ fontSize: 12, fontWeight: 700, color, fontFamily: 'var(--font-display)' }}>
                              {Math.round(pct)}%
                            </span>
                          )}
                          {actual == null && <span style={{ fontSize: 12, color: 'var(--muted)' }}>—</span>}
                        </div>
                      </div>
                      {/* Progress bar */}
                      <div style={{ height: 3, background: 'var(--border2)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', width: `${pct ?? 0}%`,
                          background: color, borderRadius: 2,
                          transition: 'width 0.6s ease',
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ padding: '8px 18px 14px', textAlign: 'right' }}>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>ดูรายละเอียด →</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
