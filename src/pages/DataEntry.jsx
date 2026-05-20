import { useState, useEffect } from 'react';
import { useApp } from '../App';
import { MONTHS_TH, SECTIONS, SECTION_COLORS } from '../config';
import { getKPIItems, getActuals, upsertActual } from '../services/kpiService';

export default function DataEntry() {
  const { year } = useApp();
  const [month, setMonth]     = useState(new Date().getMonth() + 1);
  const [section, setSection] = useState('ALL');
  const [items, setItems]     = useState([]);
  const [actuals, setActuals] = useState({});
  const [notes, setNotes]     = useState({});
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getKPIItems().then(data => setItems(data.filter(i => i.source === 'manual')));
  }, []);

  useEffect(() => {
    setLoading(true);
    getActuals(year).then(data => {
      const aMap = {}, nMap = {};
      data.filter(a => a.month === month).forEach(a => {
        aMap[a.kpi_item_id] = a.actual_value ?? '';
        nMap[a.kpi_item_id] = a.note ?? '';
      });
      setActuals(aMap); setNotes(nMap); setLoading(false);
    });
  }, [year, month]);

  const filteredItems = section === 'ALL'
    ? items
    : items.filter(i => i.section === section || i.section === 'ALL');

  const handleSave = async () => {
    setSaving(true); setSaved(false);
    try {
      await Promise.all(
        filteredItems
          .filter(item => actuals[item.id] !== '' && actuals[item.id] !== undefined)
          .map(item => upsertActual({
            kpi_item_id: item.id, year, month,
            actual_value: parseFloat(actuals[item.id]),
            note: notes[item.id] ?? '',
          }))
      );
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    } catch (e) { alert('บันทึกไม่สำเร็จ: ' + e.message); }
    finally { setSaving(false); }
  };

  const catOrder = ['financial', 'customer', 'internal', 'growth'];
  const catLabel = { financial: '💰 Financial', customer: '⭐ Customer', internal: '⚙️ Internal', growth: '📈 Growth' };
  const grouped = catOrder.map(cat => ({ cat, label: catLabel[cat], items: filteredItems.filter(i => i.category === cat) })).filter(g => g.items.length > 0);

  return (
    <div className="page-content">
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, marginBottom: 4 }}>กรอกข้อมูล Actual</h1>
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>ปี {year}</div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>เดือน</div>
          <select value={month} onChange={e => setMonth(+e.target.value)} style={{ width: 'auto', paddingRight: 28 }}>
            {MONTHS_TH.map((m, i) => <option key={i+1} value={i+1}>{m} ({i+1})</option>)}
          </select>
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>ส่วนงาน</div>
          <div style={{ display: 'flex', gap: 4 }}>
            {SECTIONS.map(s => (
              <button key={s} onClick={() => setSection(s)} style={{
                padding: '7px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                border: `1px solid ${section === s ? SECTION_COLORS[s] : 'var(--border2)'}`,
                background: section === s ? `${SECTION_COLORS[s]}20` : 'var(--bg3)',
                color: section === s ? SECTION_COLORS[s] : 'var(--text2)',
              }}>{s}</button>
            ))}
          </div>
        </div>
        <button
          onClick={handleSave} disabled={saving}
          style={{ padding: '9px 24px', borderRadius: 8, background: saved ? '#22c55e' : 'var(--accent)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, minWidth: 120 }}
        >
          {saving ? 'กำลังบันทึก...' : saved ? '✓ บันทึกแล้ว' : 'บันทึก'}
        </button>
      </div>

      {loading ? (
        <div style={{ color: 'var(--muted)', textAlign: 'center', padding: 40 }}>กำลังโหลด...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {grouped.map(({ cat, label, items: gi }) => (
            <div key={cat} className="card" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '10px 16px', background: 'var(--bg2)', borderBottom: '1px solid var(--border)', fontSize: 13, fontWeight: 700, color: 'var(--text2)' }}>
                {label}
              </div>
              <table>
                <thead><tr>
                  <th style={{ width: '30%' }}>KPI</th>
                  <th style={{ width: '8%' }}>Section</th>
                  <th style={{ width: '10%' }}>หน่วย</th>
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
                          value={actuals[item.id] ?? ''}
                          onChange={e => setActuals(p => ({ ...p, [item.id]: e.target.value }))}
                          placeholder="กรอกค่า"
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={notes[item.id] ?? ''}
                          onChange={e => setNotes(p => ({ ...p, [item.id]: e.target.value }))}
                          placeholder="หมายเหตุ"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
