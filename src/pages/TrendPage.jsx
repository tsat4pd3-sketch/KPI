import { useState, useEffect } from 'react';
import { useApp } from '../App';
import { CATEGORY_META, SECTIONS, SECTION_COLORS, calcAchievement, formatValue, MONTHS_TH } from '../config';
import { getKPIItems, getTargets, getActuals, buildMaps } from '../services/kpiService';
import { getOEEByYear } from '../services/oeeService';

const CATS = ['financial', 'customer', 'internal', 'growth'];

// Thai Summit Group VX brand palette (from presentation template)
const TSG = {
  green:      '#0d3d14',
  greenMid:   '#1a6626',
  greenLight: '#a8d4ac',
  orange:     '#c4561e',
  orangeDark: '#8b3a0a',
  orangeLight:'#e8834a',
  orangePale: '#f9cdb4',
  border:     '#cfe0d1',
  bg:         '#f5f8f5',
};

// Mini bar chart — TSG column chart style (light→dark orange, green target dashes)
function MiniBarChart({ aMap, tMap, item }) {
  const VW = 300, VH = 116;
  const months = [1,2,3,4,5,6,7,8,9,10,11,12];
  const aVals  = months.map(m => aMap?.[m] ?? null);
  const tVals  = months.map(m => tMap?.[m] ?? (tMap?.['annual'] ?? null));

  const allNums = [...aVals, ...tVals].filter(v => v != null);
  if (allNums.length === 0) return (
    <div style={{ height: VH, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#bbb', fontStyle: 'italic' }}>
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

  // Target path
  const tPts = tVals
    .map((v, i) => v != null ? { x: pL + (i + 0.5) * slotW, y: lY(v) } : null)
    .filter(Boolean);
  const tPath = tPts.length >= 2
    ? 'M ' + tPts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L ')
    : null;

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      {/* Baseline */}
      <line x1={pL} y1={pT + cH} x2={pL + cW} y2={pT + cH} stroke="#ddd" strokeWidth={1} />

      {/* Bars */}
      {aVals.map((v, i) => {
        if (v == null) return null;
        const isLatest = i === latestIdx;
        return (
          <rect key={i}
            x={bX(i).toFixed(1)} y={bY(v).toFixed(1)}
            width={barW.toFixed(1)} height={bH(v).toFixed(1)}
            rx={2}
            fill={isLatest ? TSG.orangeDark : TSG.orangeLight}
            opacity={isLatest ? 1 : 0.65}
          />
        );
      })}

      {/* Target dashed line */}
      {tPath && (
        <path d={tPath} fill="none" stroke={TSG.green} strokeWidth={1.8}
          strokeDasharray="5 3.5" strokeLinecap="round" opacity={0.75} />
      )}
      {tPts.length > 0 && (
        <circle cx={tPts[tPts.length - 1].x.toFixed(1)} cy={tPts[tPts.length - 1].y.toFixed(1)}
          r={3} fill={TSG.green} opacity={0.85} />
      )}

      {/* Month axis labels */}
      {MONTHS_TH.map((m, i) => {
        const isL = i === latestIdx;
        return (
          <text key={i}
            x={(pL + (i + 0.5) * slotW).toFixed(1)} y={VH - 4}
            textAnchor="middle" fontSize={isL ? 8.5 : 7.5}
            fontWeight={isL ? 700 : 400}
            fill={isL ? TSG.orangeDark : '#999'}
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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: TSG.green, fontWeight: 700, fontFamily: 'Tahoma, system-ui, sans-serif' }}>
      กำลังโหลดข้อมูล...
    </div>
  );

  return (
    <div className="page-content" style={{ background: TSG.bg, fontFamily: 'Tahoma, system-ui, sans-serif' }}>

      {/* ─── Page header — TSG style ─── */}
      <div style={{ marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 5 }}>
          <div style={{ width: 5, height: 34, background: TSG.green, borderRadius: 3, flexShrink: 0 }} />
          <div>
            <h1 style={{ margin: 0, fontWeight: 800, fontSize: 26, color: TSG.green, letterSpacing: '-0.3px', lineHeight: 1.1 }}>
              KPI Trend Analysis
            </h1>
            <div style={{ fontSize: 13, color: TSG.greenMid, marginTop: 3 }}>
              แนวโน้ม KPI — ปีงบประมาณ {year}
            </div>
          </div>
        </div>

        {/* Legend row */}
        <div style={{ display: 'flex', gap: 20, marginLeft: 17, marginTop: 10, flexWrap: 'wrap' }}>
          {[
            { swatch: <rect width={14} height={10} rx={2} fill={TSG.orangeDark} />, label: 'Actual (เดือนล่าสุด)' },
            { swatch: <rect width={14} height={10} rx={2} fill={TSG.orangeLight} opacity={0.65} />, label: 'Actual (เดือนก่อน)' },
            { swatch: <line x1={0} y1={5} x2={20} y2={5} stroke={TSG.green} strokeWidth={1.8} strokeDasharray="5 3.5" />, label: 'Target', w: 20 },
          ].map(({ swatch, label, w = 14 }) => (
            <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#555' }}>
              <svg width={w} height={10} style={{ flexShrink: 0 }}>{swatch}</svg>
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* ─── Section filter — TSG button style ─── */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' }}>
        {[{ key: 'ALL', label: 'ทั้งหมด' }, ...SECTIONS.filter(s => s !== 'ALL').map(s => ({ key: s, label: s }))].map(({ key: s, label }) => {
          const isSel = section === s;
          return (
            <button key={s} onClick={() => setSection(s)} style={{
              padding: '7px 18px', borderRadius: 4, fontSize: 12, fontWeight: 700,
              border: `1.5px solid ${isSel ? TSG.green : TSG.border}`,
              background: isSel ? TSG.green : '#fff',
              color: isSel ? '#fff' : TSG.green,
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
            {/* TSG-style category header band */}
            <div style={{
              background: TSG.green,
              padding: '10px 20px',
              borderRadius: '6px 6px 0 0',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{ fontSize: 16, lineHeight: 1 }}>{meta.icon}</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: '#fff', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {meta.label}
              </span>
              <span style={{ fontSize: 12, color: TSG.greenLight, letterSpacing: '0.02em' }}>— {meta.labelTH}</span>
              <span style={{ marginLeft: 'auto', fontSize: 11, color: TSG.greenLight, opacity: 0.8 }}>
                {catItems.length} items
              </span>
            </div>

            {/* KPI card grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))',
              gap: 1,
              background: TSG.border,
              border: `1px solid ${TSG.border}`,
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

                const prevVal  = latestMonth && latestMonth > 1 ? aMap[latestMonth - 1] : null;
                const trendUp  = prevVal != null && actual != null ? (item.lower_better ? actual < prevVal : actual > prevVal) : null;

                const statusColor = pct == null ? '#aaa' : pct >= 90 ? '#15803d' : pct >= 70 ? '#b45309' : '#b91c1c';
                const statusBg    = pct == null ? '#f3f4f6' : pct >= 90 ? '#dcfce7' : pct >= 70 ? '#fef9c3' : '#fee2e2';
                const statusLabel = pct == null ? 'N/A' : pct >= 90 ? 'ON TRACK' : pct >= 70 ? 'MONITOR' : 'AT RISK';

                const secClr = SECTION_COLORS[item.section] ?? '#888';

                return (
                  <div key={item.id} style={{ background: '#fff', padding: '16px 18px 14px', display: 'flex', flexDirection: 'column' }}>

                    {/* Top meta row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: 10, color: '#aaa', fontWeight: 600, letterSpacing: '0.05em' }}>{item.kpi_no}</span>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <span style={{ fontSize: 9, fontWeight: 700, color: secClr, background: `${secClr}18`, padding: '1px 6px', borderRadius: 3 }}>
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
                    <div style={{ fontSize: 12, fontWeight: 700, color: TSG.green, lineHeight: 1.4, marginBottom: 12, minHeight: 34 }}>
                      {item.name_en}
                    </div>

                    {/* Large value */}
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 32, fontWeight: 800, color: TSG.orangeDark, lineHeight: 1 }}>
                        {actual != null ? formatValue(item, actual) : '—'}
                      </span>
                      {trendUp != null && (
                        <span style={{ fontSize: 14, fontWeight: 800, color: trendUp ? '#15803d' : '#b91c1c' }}>
                          {trendUp ? '▲' : '▼'}
                        </span>
                      )}
                      <span style={{ fontSize: 10, color: '#aaa', marginLeft: 'auto', fontStyle: 'italic' }}>
                        {latestMonth ? `${MONTHS_TH[latestMonth - 1]} ${year}` : ''}
                      </span>
                    </div>

                    {/* Achievement progress bar */}
                    {pct != null ? (
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#888', marginBottom: 4 }}>
                          <span>Achievement vs Target{target != null ? ` (${formatValue(item, target)})` : ''}</span>
                          <span style={{ fontWeight: 800, color: statusColor }}>{Math.round(pct)}%</span>
                        </div>
                        <div style={{ height: 5, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: statusColor, borderRadius: 3, transition: 'width 0.6s ease' }} />
                        </div>
                      </div>
                    ) : (
                      <div style={{ marginBottom: 12, fontSize: 10, color: '#bbb', fontStyle: 'italic' }}>ไม่มี Target</div>
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

      {/* ─── TSG footer branding ─── */}
      <div style={{ marginTop: 8, paddingTop: 14, borderTop: `1.5px solid ${TSG.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 18, height: 18, background: TSG.orange, borderRadius: 3 }} />
          <span style={{ fontWeight: 800, fontSize: 12, color: TSG.green, letterSpacing: '0.08em' }}>THAI SUMMIT GROUP</span>
        </div>
        <span style={{ fontSize: 11, color: '#aaa' }}>KPI Performance Dashboard — FY {year}</span>
      </div>
    </div>
  );
}
