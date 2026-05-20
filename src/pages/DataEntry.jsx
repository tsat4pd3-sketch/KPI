import { useState, useEffect } from 'react';
import { useApp } from '../App';
import { MONTHS_TH } from '../config';
import { getKPIItems, getActuals, upsertActual } from '../services/kpiService';

export default function DataEntry() {
  const { year } = useApp();
  const [month, setMonth]   = useState(new Date().getMonth() + 1);
  const [items, setItems]   = useState([]);
  const [actuals, setActuals] = useState({});
  const [notes, setNotes]   = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getKPIItems().then(data => {
      setItems(data.filter(i => i.source === 'manual'));
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    getActuals(year).then(data => {
      const map = {};
      const noteMap = {};
      data.filter(a => a.month === month).forEach(a => {
        map[a.kpi_item_id] = a.actual_value ?? '';
        noteMap[a.kpi_item_id] = a.note ?? '';
      });
      setActuals(map);
      setNotes(noteMap);
      setLoading(false);
    });
  }, [year, month]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await Promise.all(
        items
          .filter(item => actuals[item.id] !== '' && actuals[item.id] !== undefined)
          .map(item =>
            upsertActual({
              kpi_item_id: item.id,
              year,
              month,
              actual_value: parseFloat(actuals[item.id]),
              note: notes[item.id] ?? '',
            })
          )
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      alert('บันทึกไม่สำเร็จ: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const catOrder = ['financial', 'customer', 'internal', 'growth'];
  const catLabel = { financial: '💰 Financial', customer: '⭐ Customer', internal: '⚙️ Internal Process', growth: '📈 Growth' };
  const grouped  = catOrder.map(cat => ({
    cat,
    label: catLabel[cat],
    items: items.filter(i => i.category === cat),
  })).filter(g => g.items.length > 0);

  return (
    <div className="page-content">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, marginBottom: 4 }}>กรอกข้อมูล Actual</h1>
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>กรอกข้อมูลผลลัพธ์จริงรายเดือน</div>
      </div>

      {/* Year + Month selector */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 5 }}>ปี</div>
          <div style={{ padding: '9px 16px', background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 8, fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
            {year}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 5 }}>เดือน</div>
          <select value={month} onChange={e => setMonth(+e.target.value)} style={{ width: 'auto', paddingRight: 32 }}>
            {MONTHS_TH.map((m, i) => (
              <option key={i + 1} value={i + 1}>{m} ({i + 1})</option>
            ))}
          </select>
        </div>
        <button
          onClick={handleSave} disabled={saving}
          style={{
            padding: '9px 24px', borderRadius: 8, background: saved ? '#22c55e' : 'var(--accent)',
            color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, minWidth: 120,
          }}
        >
          {saving ? 'กำลังบันทึก...' : saved ? '✓ บันทึกแล้ว' : 'บันทึก'}
        </button>
      </div>

      {loading ? (
        <div style={{ color: 'var(--muted)', textAlign: 'center', padding: 40 }}>กำลังโหลด...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {grouped.map(({ cat, label, items: catItems }) => (
            <div key={cat} className="card" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '12px 18px', background: 'var(--bg2)', borderBottom: '1px solid var(--border)', fontSize: 13, fontWeight: 700, color: 'var(--text2)' }}>
                {label}
              </div>
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '35%' }}>KPI</th>
                    <th style={{ width: '20%' }}>หน่วย</th>
                    <th style={{ width: '25%' }}>Actual</th>
                    <th>หมายเหตุ</th>
                  </tr>
                </thead>
                <tbody>
                  {catItems.map(item => (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 500 }}>{item.name_th}</td>
                      <td style={{ color: 'var(--muted)' }}>{item.unit}</td>
                      <td>
                        <input
                          type="number" step="any"
                          value={actuals[item.id] ?? ''}
                          onChange={e => setActuals(prev => ({ ...prev, [item.id]: e.target.value }))}
                          placeholder="กรอกค่า"
                          style={{ width: '100%', minWidth: 80 }}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={notes[item.id] ?? ''}
                          onChange={e => setNotes(prev => ({ ...prev, [item.id]: e.target.value }))}
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
