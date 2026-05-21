import { useState, useEffect } from 'react';
import { useApp } from '../App';
import { CATEGORY_META, SECTIONS, SECTION_COLORS, calcAchievement, achievementColor, formatValue, MONTHS_TH } from '../config';
import { getKPIItems, getTargets, getActuals, buildMaps } from '../services/kpiService';
import { getOEEByYear } from '../services/oeeService';

const CATS = ['financial', 'customer', 'internal', 'growth'];

function Sparkline({ aMap, tMap, color, w = 168, h = 56 }) {
  const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const aVals = months.map(m => aMap?.[m] ?? null);
  const tVals = months.map(m => tMap?.[m] ?? (tMap?.['annual'] ?? null));

  const all = [...aVals, ...tVals].filter(v => v != null);
  if (all.length === 0) return (
    <div style={{ width: w, height: h, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'var(--muted)' }}>—</div>
  );

  const minV = Math.min(...all);
  const maxV = Math.max(...all);
  const range = (maxV - minV) || 1;
  const px = 6, py = 6;
  const W = w - px * 2, H = h - py * 2;

  const toX = i => (px + (i / 11) * W).toFixed(2);
  const toY = v => (py + H - ((v - minV) / range) * H).toFixed(2);

  const buildPath = vals => {
    let d = '', on = false;
    vals.forEach((v, i) => {
      if (v == null) { on = false; return; }
      d += on ? ` L ${toX(i)} ${toY(v)}` : `M ${toX(i)} ${toY(v)}`;
      on = true;
    });
    return d;
  };

  const lastIdx = aVals.reduceRight((a, v, i) => a === -1 && v != null ? i : a, -1);

  return (
    <svg width={w} height={h} style={{ display: 'block', overflow: 'visible' }}>
      {/* Target — gray dashed */}
      <path d={buildPath(tVals)} fill="none" stroke="var(--muted)" strokeWidth={1.2} strokeDasharray="3 2.5" opacity={0.45} />
      {/* Actual — colored */}
      <path d={buildPath(aVals)} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {/* Dot on latest actual */}
      {lastIdx !== -1 && (
        <circle cx={toX(lastIdx)} cy={toY(aVals[lastIdx])} r={3} fill={color} stroke="var(--bg)" strokeWidth={1.5} />
      )}
    </svg>
  );
}

export default function TrendPage() {
  const { year } = useApp();
  const [items, setItems] = useState([]);
  const [maps, setMaps] = useState(null);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState('ALL');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getKPIItems(),
      getTargets(year),
      getActuals(year),
      getOEEByYear(year).catch(() => null),
    ]).then(([allItems, targets, actuals, oeeData]) => {
      setItems(allItems);
      setMaps(buildMaps(allItems, targets, actuals, oeeData));
      setLoading(false);
    });
  }, [year]);

  const visibleItems = section === 'ALL'
    ? items
    : items.filter(x => x.section === section || x.section === 'ALL');

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--muted)' }}>
      กำลังโหลด...
    </div>
  );

  return (
    <div className="page-content">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 24 }}>แนวโน้ม KPI</h1>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span>ปีงบประมาณ {year}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <svg width={20} height={4}><line x1={0} y1={2} x2={20} y2={2} stroke="currentColor" strokeWidth={2} /></svg> Actual
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, opacity: 0.5 }}>
              <svg width={20} height={4}><line x1={0} y1={2} x2={20} y2={2} stroke="currentColor" strokeWidth={1.5} strokeDasharray="3 2" /></svg> Target
            </span>
          </div>
        </div>
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

      {/* Category rows */}
      {CATS.map(cat => {
        const meta = CATEGORY_META[cat];
        const catItems = visibleItems.filter(x => x.category === cat);
        if (catItems.length === 0) return null;

        return (
          <div key={cat} style={{ display: 'flex', marginBottom: 16, alignItems: 'stretch', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
            {/* Category label — vertical */}
            <div style={{
              writingMode: 'vertical-rl', transform: 'rotate(180deg)',
              background: meta.color, color: '#fff',
              fontWeight: 800, fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '16px 7px', flexShrink: 0, whiteSpace: 'nowrap', gap: 6,
            }}>
              {meta.icon}  {meta.label}
            </div>

            {/* Cards grid */}
            <div style={{
              flex: 1,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
              background: 'var(--border)',
              gap: 1,
            }}>
              {catItems.map(item => {
                const aMap = maps?.actualMap?.[item.id] ?? {};
                const tMap = maps?.targetMap?.[item.id] ?? {};

                const latestMonth = [12,11,10,9,8,7,6,5,4,3,2,1].find(m => aMap[m] != null);
                const actual  = latestMonth != null ? aMap[latestMonth] : null;
                const target  = latestMonth != null ? (tMap[latestMonth] ?? tMap['annual'] ?? null) : null;
                const pct     = calcAchievement(item, actual, target);
                const clr     = pct != null ? achievementColor(pct) : meta.color;
                const secClr  = SECTION_COLORS[item.section] ?? 'var(--muted)';

                const prevVal  = latestMonth != null && latestMonth > 1 ? aMap[latestMonth - 1] : null;
                const trendUp  = prevVal != null && actual != null ? (item.lower_better ? actual < prevVal : actual > prevVal) : null;

                const statusIcon = pct == null ? null : pct >= 90 ? '✅' : pct >= 70 ? '⚠️' : '🔴';

                return (
                  <div key={item.id} style={{ background: 'var(--bg)', padding: '13px 15px 10px' }}>
                    {/* Section badge + name */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 5, marginBottom: 7 }}>
                      <span style={{
                        fontSize: 9, fontWeight: 700, flexShrink: 0, marginTop: 1,
                        color: secClr, background: `${secClr}18`, padding: '1px 5px', borderRadius: 3,
                      }}>{item.section}</span>
                      <span style={{ fontSize: 11, color: 'var(--text2)', lineHeight: 1.35 }}>{item.name_en}</span>
                    </div>

                    {/* Big value */}
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginBottom: 2 }}>
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 26, color: 'var(--text1)', lineHeight: 1 }}>
                        {actual != null ? formatValue(item, actual) : '—'}
                      </span>
                      {trendUp != null && (
                        <span style={{ fontSize: 13, fontWeight: 700, color: trendUp ? '#22c55e' : '#e74c3c' }}>
                          {trendUp ? '▲' : '▼'}
                        </span>
                      )}
                    </div>

                    {/* Achievement line */}
                    <div style={{ fontSize: 11, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
                      {statusIcon && <span>{statusIcon}</span>}
                      {pct != null
                        ? <span style={{ fontWeight: 700, color: clr }}>{Math.round(pct)}%</span>
                        : <span style={{ color: 'var(--muted)' }}>—</span>}
                      {target != null && (
                        <span style={{ color: 'var(--muted)', fontSize: 10 }}>vs {formatValue(item, target)}</span>
                      )}
                    </div>

                    {/* Sparkline */}
                    <Sparkline aMap={aMap} tMap={tMap} color={clr} />

                    {/* Month axis */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
                      {MONTHS_TH.map((m, i) => {
                        const isLatest = latestMonth === i + 1;
                        return (
                          <span key={i} style={{ fontSize: 7, fontWeight: isLatest ? 700 : 400, color: isLatest ? clr : 'var(--muted)', opacity: isLatest ? 1 : 0.5 }}>{m}</span>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
