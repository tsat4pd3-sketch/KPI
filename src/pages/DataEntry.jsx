import { useState, useEffect, useMemo } from 'react';
import { useApp } from '../App';
import { MONTHS_TH, SECTIONS, SECTION_COLORS, RAW_FIELD_GROUPS, formatValue } from '../config';
import { getKPIItems, getActuals, upsertActual } from '../services/kpiService';
import { getRawInputs, saveRawInputAndCompute, computeActuals } from '../services/rawInputService';

function ComputedPreview({ items, rawVals, section, allRaws, month, year }) {
  const preview = useMemo(() => {
    if (!items.length) return [];
    const raw = { ...rawVals, year, month, section };
    const computed = computeActuals(raw, items, allRaws, month);
    return Object.entries(computed).map(([id, val]) => {
      const item = items.find(i => i.id === id);
      return item ? { item, val } : null;
    }).filter(Boolean);
  }, [rawVals, items, allRaws, month, section, year]);

  if (!preview.length) return null;
  return (
    <div style={{ marginTop: 14, padding: 12, background: 'var(--bg2)', borderRadius: 8, border: '1px solid var(--border)' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', marginBottom: 8, letterSpacing: 1 }}>
        🔢 ค่า KPI ที่คำนวณได้
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {preview.map(({ item, val }) => (
          <div key={item.id} style={{
            padding: '6px 12px', borderRadius: 8,
            background: 'var(--bg3)', border: '1px solid var(--border2)', fontSize: 12,
          }}>
            <span style={{ color: 'var(--muted)' }}>{item.kpi_no} {item.name_en}: </span>
            <span style={{ fontWeight: 700, fontFamily: 'var(--font-display)' }}>{formatValue(item, val)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RawInputForm({ section, rawVals, onChange }) {
  const groups = RAW_FIELD_GROUPS[section];
  if (!groups) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {groups.map(({ group, fields }) => (
        <div key={group}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>
            {group}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
            {fields.map(({ key, label, integer }) => (
              <label key={key} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>{label}</span>
                <input
                  type="number"
                  step={integer ? '1' : 'any'}
                  value={rawVals[key] ?? ''}
                  onChange={e => onChange(key, e.target.value, integer)}
                  placeholder="—"
                  style={{ fontSize: 13 }}
                />
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function DataEntry() {
  const { year } = useApp();
  const [month, setMonth]     = useState(new Date().getMonth() + 1);
  const [section, setSection] = useState('ALL');
  const [items, setItems]     = useState([]);
  const [allRaws, setAllRaws] = useState([]);
  const [rawVals, setRawVals] = useState({});
  const [manActuals, setManActuals] = useState({});
  const [manNotes, setManNotes]     = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { getKPIItems().then(setItems); }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([getActuals(year), getRawInputs(year)]).then(([actuals, raws]) => {
      setAllRaws(raws);
      const aMap = {}, nMap = {};
      actuals.filter(a => a.month === month).forEach(a => {
        aMap[a.kpi_item_id] = a.actual_value ?? '';
        nMap[a.kpi_item_id] = a.note ?? '';
      });
      setManActuals(aMap);
      setManNotes(nMap);
      const raw = raws.find(r => r.section === section && r.month === month && r.year === year);
      setRawVals(raw ? { ...raw } : {});
      setLoading(false);
    });
  }, [year, month]); // eslint-disable-line

  useEffect(() => {
    const raw = allRaws.find(r => r.section === section && r.month === month && r.year === year);
    setRawVals(raw ? { ...raw } : {});
  }, [section]); // eslint-disable-line

  const handleRawChange = (key, strVal, integer) => {
    setRawVals(p => ({
      ...p,
      [key]: strVal === '' ? null : integer ? parseInt(strVal, 10) : parseFloat(strVal),
    }));
  };

  const manualItems = items.filter(i =>
    i.source === 'manual' &&
    (section === 'ALL' || i.section === section || i.section === 'ALL')
  );

  const catLabel = { financial: '💰 Financial', customer: '⭐ Customer', internal: '⚙️ Internal', growth: '📈 Growth' };
  const catOrder = ['financial', 'customer', 'internal', 'growth'];
  const groupedManual = catOrder
    .map(cat => ({ cat, label: catLabel[cat], items: manualItems.filter(i => i.category === cat) }))
    .filter(g => g.items.length > 0);

  const handleSave = async () => {
    setSaving(true); setSaved(false);
    try {
      await Promise.all(
        manualItems
          .filter(i => manActuals[i.id] !== '' && manActuals[i.id] !== undefined)
          .map(i => upsertActual({
            kpi_item_id: i.id, year, month,
            actual_value: parseFloat(manActuals[i.id]),
            note: manNotes[i.id] ?? '',
          }))
      );

      const hasData = Object.values(rawVals).some(v => v != null && v !== '');
      if (hasData) {
        const rawRecord = { year, month, section, ...rawVals };
        const updatedRaws = await saveRawInputAndCompute(rawRecord, items, allRaws);
        setAllRaws(updatedRaws);
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      alert('บันทึกไม่สำเร็จ: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-content">
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, marginBottom: 4 }}>กรอกข้อมูล Actual</h1>
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>ปี {year}</div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>เดือน</div>
          <select value={month} onChange={e => setMonth(+e.target.value)} style={{ width: 'auto', paddingRight: 28 }}>
            {MONTHS_TH.map((m, i) => <option key={i + 1} value={i + 1}>{m} ({i + 1})</option>)}
          </select>
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>ส่วนงาน</div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {SECTIONS.map(s => {
              const label = s === 'ALL' ? '🏭 รวมโรงงาน' : s;
              const isAll = s === 'ALL';
              return (
                <button key={s} onClick={() => setSection(s)} style={{
                  padding: '7px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                  border: `1px solid ${section === s ? (isAll ? '#6366f1' : SECTION_COLORS[s]) : 'var(--border2)'}`,
                  background: section === s ? `${isAll ? '#6366f1' : SECTION_COLORS[s]}20` : 'var(--bg3)',
                  color: section === s ? (isAll ? '#6366f1' : SECTION_COLORS[s]) : 'var(--text2)',
                }}>{label}</button>
              );
            })}
          </div>
          {section === 'ALL' && (
            <div style={{ fontSize: 11, color: '#6366f1', marginTop: 5, opacity: 0.85 }}>
              💡 กรอกส่วนนี้ก่อน — ระบบจะใช้ยอดขายรวมโรงงานคำนวณ DL%/OH% ให้ทุกแผนกอัตโนมัติ
            </div>
          )}
        </div>
        <button
          onClick={handleSave} disabled={saving}
          style={{
            padding: '9px 24px', borderRadius: 8, fontWeight: 700, fontSize: 14,
            minWidth: 120, border: 'none', color: '#fff',
            background: saved ? '#22c55e' : 'var(--accent)',
          }}
        >
          {saving ? 'กำลังบันทึก...' : saved ? '✓ บันทึกแล้ว' : '💾 บันทึก'}
        </button>
      </div>

      {loading ? (
        <div style={{ color: 'var(--muted)', textAlign: 'center', padding: 40 }}>กำลังโหลด...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Raw input card */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '10px 16px', background: 'var(--bg2)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text2)' }}>
                {section === 'ALL' ? '🏭 ข้อมูลรวมโรงงาน' : '📊 ข้อมูลดิบ'}
              </span>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
                background: section === 'ALL' ? '#6366f120' : `${SECTION_COLORS[section]}20`,
                color: section === 'ALL' ? '#6366f1' : SECTION_COLORS[section],
              }}>
                {section === 'ALL' ? 'รวมโรงงาน' : section}
              </span>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>— คำนวณ KPI อัตโนมัติหลังบันทึก</span>
            </div>
            <div style={{ padding: 16 }}>
              <RawInputForm section={section} rawVals={rawVals} onChange={handleRawChange} />
              <ComputedPreview items={items} rawVals={rawVals} section={section} allRaws={allRaws} month={month} year={year} />
            </div>
          </div>

          {/* Manual items */}
          {groupedManual.length > 0 && (
            <>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', letterSpacing: 1 }}>📝 กรอกตรง (Safety / Maintenance)</div>
              {groupedManual.map(({ cat, label, items: gi }) => (
                <div key={cat} className="card" style={{ overflow: 'hidden' }}>
                  <div style={{ padding: '10px 16px', background: 'var(--bg2)', borderBottom: '1px solid var(--border)', fontSize: 13, fontWeight: 700, color: 'var(--text2)' }}>
                    {label}
                  </div>
                  <table>
                    <thead><tr>
                      <th style={{ width: '35%' }}>KPI</th>
                      <th style={{ width: '8%' }}>Section</th>
                      <th style={{ width: '8%' }}>หน่วย</th>
                      <th style={{ width: '22%' }}>Actual</th>
                      <th>หมายเหตุ</th>
                    </tr></thead>
                    <tbody>
                      {gi.map(item => (
                        <tr key={item.id}>
                          <td style={{ fontWeight: 500 }}>
                            <div>{item.name_en}</div>
                            <div style={{ fontSize: 11, color: 'var(--muted)' }}>Target: {item.commitment}</div>
                          </td>
                          <td>
                            <span style={{ fontSize: 10, fontWeight: 700, color: SECTION_COLORS[item.section], background: `${SECTION_COLORS[item.section]}18`, padding: '2px 6px', borderRadius: 4 }}>
                              {item.section}
                            </span>
                          </td>
                          <td style={{ color: 'var(--muted)' }}>{item.unit}</td>
                          <td>
                            <input
                              type="number" step="any"
                              value={manActuals[item.id] ?? ''}
                              onChange={e => setManActuals(p => ({ ...p, [item.id]: e.target.value }))}
                              placeholder="กรอกค่า"
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              value={manNotes[item.id] ?? ''}
                              onChange={e => setManNotes(p => ({ ...p, [item.id]: e.target.value }))}
                              placeholder="หมายเหตุ"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
