import { useState, useEffect } from 'react';
import { useApp } from '../App';
import { CATEGORY_META, SECTIONS, SECTION_COLORS, calcAchievement, achievementColor, formatValue, MONTHS_TH } from '../config';
import { getKPIItems, getTargets, getActuals, buildMaps } from '../services/kpiService';
import { getOEEByYear } from '../services/oeeService';

const CATS = ['financial', 'customer', 'internal', 'growth'];

// TSG chart brand colors — intentionally fixed regardless of light/dark theme (data visualization)
const C_BAR_LATEST = '#8b3a0a';  // darkest orange (latest month bar)
const C_BAR_PRIOR  = '#e8834a';  // mid orange (prior month bars)
const C_HDR_BG     = '#0d3d14';  // category header bg — always dark forest green (like sidebar)
const C_ORANGE     = '#c4561e';  // footer branding swatch

// Mini bar chart — TSG column chart style (light→dark orange, green target dashes)
function MiniBarChart({ aMap, tMap, item }) {
  const VW = 300, VH = 116;
  const months = [1,2,3,4,5,6,7,8,9,10,11,12];
  const aVals  = months.map(m => aMap?.[m] ?? null);
  const tVals  = months.map(m => tMap?.[m] ?? (tMap?.['annual'] ?? null));

  const allNums = [...aVals, ...tVals].filter(v => v != null);
  if (allNums.length === 0) return (
    <div style={{ height: VH, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'var(--muted)', fontStyle: 'italic' }}>
      ยังไม่มีข้อมูล
    </div>
  );

  const minV = 0;
  const maxV = Math.max(...allNums, 0.0001);
  const range = maxV - minV;

  const pL = 4, pR = 4, pT = 8, pB = 20;
  const cW = VW - pL - pR;
  const cH = VH - pT - pB;
  const slotW = cW / 12;
  const barW  = slotW * 0.58;

  const bX  = i  => pL + i * slotW + (slotW - barW) / 2;
  const bH  = v  => Math.max(((Math.max(v, 0) - minV) / range) * cH, 2);
  const bY  = v  => pT + cH - bH(v);
  const lY  = v  => pT + cH - ((v - minV) / range) * cH;

  const latestIdx = aVals.reduceRight((a, v, i) => a === -1 && v != null ? i : a, -1);

  const tPts = tVals
    .map((v, i) => v != null ? { x: pL + (i + 0.5) * slotW, y: lY(v) } : null)
    .filter(Boolean);
  const tPath = tPts.length >= 2
    ? 'M ' + tPts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L ')
    : null;

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      <line x1={pL} y1={pT + cH} x2={pL + cW} y2={pT + cH} style={{ stroke: 'var(--border)' }} strokeWidth={1} />

      {aVals.map((v, i) => {
        if (v == null) return null;
        const isLatest = i === latestIdx;
        return (
          <rect key={i}
            x={bX(i).toFixed(1)} y={bY(v).toFixed(1)}
            width={barW.toFixed(1)} height={bH(v).toFixed(1)}
            rx={2}
            fill={isLatest ? C_BAR_LATEST : C_BAR_PRIOR}
            opacity={isLatest ? 1 : 0.65}
          />
        );
      })}

      {tPath && (
        <path d={tPath} fill="none" style={{ stroke: 'var(--accent)' }} strokeWidth={1.8}
          strokeDasharray="5 3.5" strokeLinecap="round" opacity={0.75} />
      )}
      {tPts.length > 0 && (
        <circle cx={tPts[tPts.length - 1].x.toFixed(1)} cy={tPts[tPts.length - 1].y.toFixed(1)}
          r={3} style={{ fill: 'var(--accent)' }} opacity={0.85} />
      )}

      {MONTHS_TH.map((m, i) => {
        const isL = i === latestIdx;
        return (
          <text key={i}
            x={(pL + (i + 0.5) * slotW).toFixed(1)} y={VH - 4}
            textAnchor="middle" fontSize={isL ? 8.5 : 7.5}
            fontWeight={isL ? 700 : 400}
            style={{ fill: isL ? C_BAR_LATEST : 'var(--muted)' }}
          >{m}</text>
        );
      })}
    </svg>
  );
}

export default function TrendPage() {
  const { year } = useApp();
  const [items, setItems]   = useState([]);
  const [maps, setMaps]     = useState(null);
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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--accent)', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
      กำลังโหลดข้อมูล...
    </div>
  );

  return (
    <div className="page-content">

      {/* ─── Page header ─── */}
      <div style={{ marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 5 }}>
          <div style={{ width: 5, height: 34, background: 'var(--accent)', borderRadius: 3, flexShrink: 0 }} />
          <div>
            <h1 style={{ margin: 0, fontWeight: 800, fontSize: 26, color: 'var(--accent)', letterSpacing: '-0.3px', lineHeight: 1.1 }}>
              KPI Trend Analysis
            </h1>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 3 }}>
              แนวโน้ม KPI — ปีงบประมาณ {year}
            </div>
          </div>
        </div>

        {/* Legend row */}
        <div style={{ display: 'flex', gap: 20, marginLeft: 17, marginTop: 10, flexWrap: 'wrap' }}>
          {[
            { swatch: <rect width={14} height={10} rx={2} fill={C_BAR_LATEST} />, label: 'Actual (เดือนล่าสุด)' },
            { swatch: <rect width={14} height={10} rx={2} fill={C_BAR_PRIOR} opacity={0.65} />, label: 'Actual (เดือนก่อน)' },
            { swatch: <line x1={0} y1={5} x2={20} y2={5} style={{ stroke: 'var(--accent)' }} strokeWidth={1.8} strokeDasharray="5 3.5" />, label: 'Target', w: 20 },
          ].map(({ swatch, label, w = 14 }) => (
            <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text2)' }}>
              <svg width={w} height={10} style={{ flexShrink: 0 }}>{swatch}</svg>
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* ─── Section filter ─── */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' }}>
        {[{ key: 'ALL', label: 'ทั้งหมด' }, ...SECTIONS.filter(s => s !== 'ALL').map(s => ({ key: s, label: s }))].map(({ key: s, label }) => {
          const isSel = section === s;
          return (
            <button key={s} onClick={() => setSection(s)} style={{
              padding: '7px 18px', borderRadius: 4, fontSize: 12, fontWeight: 700,
              border: `1.5px solid ${isSel ? 'var(--accent)' : 'var(--border)'}`,
              background: isSel ? 'var(--accent)' : 'var(--bg2)',
              color: isSel ? '#fff' : 'var(--accent)',
              cursor: 'pointer', letterSpacing: '0.03em',
              transition: 'all 0.15s',
            }}>{label}</button>
          );
        })}
      </div>

      {/* ─── Category sections ─── */}
      {CATS.map(cat => {
        const meta = CATEGORY_META[cat];
        const catItems = visibleItems.filter(x => x.category === cat);
        if (catItems.length === 0) return null;

        return (
          <div key={cat} style={{ marginBottom: 28 }}>
            {/* Category header band — always dark forest green (like sidebar) */}
            <div style={{
              background: C_HDR_BG,
              padding: '10px 20px',
              borderRadius: '6px 6px 0 0',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{ fontSize: 16, lineHeight: 1 }}>{meta.icon}</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: '#fff', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {meta.label}
              </span>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.02em' }}>— {meta.labelTH}</span>
              <span style={{ marginLeft: 'auto', fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
                {catItems.length} items
              </span>
            </div>

            {/* KPI card grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))',
              gap: 1,
              background: 'var(--border)',
              border: '1px solid var(--border)',
              borderTop: 'none',
              borderRadius: '0 0 6px 6px',
              overflow: 'hidden',
            }}>
              {catItems.map(item => {
                const aMap = maps?.actualMap?.[item.id] ?? {};
                const tMap = maps?.targetMap?.[item.id] ?? {};

                const latestMonth = [12,11,10,9,8,7,6,5,4,3,2,1].find(m => aMap[m] != null);
                const actual = latestMonth != null ? aMap[latestMonth] : null;
                const target = latestMonth != null ? (tMap[latestMonth] ?? tMap['annual'] ?? null) : null;
                const pct    = calcAchievement(item, actual, target);

                const prevVal = latestMonth && latestMonth > 1 ? aMap[latestMonth - 1] : null;
                const trendUp = prevVal != null && actual != null ? (item.lower_better ? actual < prevVal : actual > prevVal) : null;

                const statusColor = achievementColor(pct);
                const statusBg    = pct == null ? 'var(--bg3)' : pct >= 90 ? 'var(--green-dim)' : pct >= 70 ? 'var(--amber-dim)' : 'var(--red-dim)';
                const statusLabel = pct == null ? 'N/A' : pct >= 90 ? 'ON TRACK' : pct >= 70 ? 'MONITOR' : 'AT RISK';

                const secClr = SECTION_COLORS[item.section];

                return (
                  <div key={item.id} style={{ background: 'var(--card)', padding: '16px 18px 14px', display: 'flex', flexDirection: 'column' }}>

                    {/* Top meta row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600, letterSpacing: '0.05em' }}>{item.kpi_no}</span>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <span style={{
                          fontSize: 9, fontWeight: 700,
                          color: secClr ?? 'var(--muted)',
                          background: secClr ? `${secClr}18` : 'var(--accent-dim)',
                          padding: '1px 6px', borderRadius: 3,
                        }}>
                          {item.section}
                        </span>
                        {pct != null && (
                          <span style={{ fontSize: 9, fontWeight: 700, color: statusColor, background: statusBg, padding: '1px 6px', borderRadius: 3, letterSpacing: '0.03em' }}>
                            {statusLabel}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* KPI name */}
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', lineHeight: 1.4, marginBottom: 12, minHeight: 34 }}>
                      {item.name_en}
                    </div>

                    {/* Large value */}
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 32, fontWeight: 800, color: C_BAR_LATEST, lineHeight: 1 }}>
                        {actual != null ? formatValue(item, actual) : '—'}
                      </span>
                      {trendUp != null && (
                        <span style={{ fontSize: 14, fontWeight: 800, color: trendUp ? 'var(--green)' : 'var(--red)' }}>
                          {trendUp ? '▲' : '▼'}
                        </span>
                      )}
                      <span style={{ fontSize: 10, color: 'var(--muted)', marginLeft: 'auto', fontStyle: 'italic' }}>
                        {latestMonth ? `${MONTHS_TH[latestMonth - 1]} ${year}` : ''}
                      </span>
                    </div>

                    {/* Achievement progress bar */}
                    {pct != null ? (
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--muted)', marginBottom: 4 }}>
                          <span>Achievement vs Target{target != null ? ` (${formatValue(item, target)})` : ''}</span>
                          <span style={{ fontWeight: 800, color: statusColor }}>{Math.round(pct)}%</span>
                        </div>
                        <div style={{ height: 5, background: 'var(--border2)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: statusColor, borderRadius: 3, transition: 'width 0.6s ease' }} />
                        </div>
                      </div>
                    ) : (
                      <div style={{ marginBottom: 12, fontSize: 10, color: 'var(--muted)', fontStyle: 'italic' }}>ไม่มี Target</div>
                    )}

                    {/* Bar chart */}
                    <MiniBarChart aMap={aMap} tMap={tMap} item={item} />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* ─── Footer branding ─── */}
      <div style={{ marginTop: 8, paddingTop: 14, borderTop: '1.5px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 18, height: 18, background: C_ORANGE, borderRadius: 3 }} />
          <span style={{ fontWeight: 800, fontSize: 12, color: 'var(--accent)', letterSpacing: '0.08em' }}>THAI SUMMIT GROUP</span>
        </div>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>KPI Performance Dashboard — FY {year}</span>
      </div>
    </div>
  );
}
