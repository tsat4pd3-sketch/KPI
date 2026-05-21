import { useState, useEffect } from 'react';
import { useApp } from '../App';
import { MONTHS_TH } from '../config';
import { getKPIItems, getTargets, upsertTarget } from '../services/kpiService';

export default function TargetSetting() {
  const { year } = useApp();
  const [items, setItems]   = useState([]);
  const [targets, setTargets] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);
  const [mode, setMode]     = useState('annual');
  const [activeMonth, setActiveMonth] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([getKPIItems(), getTargets(year)]).then(([items, tgts]) => {
      setItems(items);
      const map = {};
      tgts.forEach(t => {
        const key = t.month != null ? `${t.kpi_item_id}_m${t.month}` : `${t.kpi_item_id}_annual`;
        map[key] = t.target_value ?? '';
      });
      setTargets(map);
      setLoading(false);
    });
  }, [year]);

  const getKey = (itemId, month) =>
    month != null ? `${itemId}_m${month}` : `${itemId}_annual`;

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const ops = [];
      items.forEach(item => {
        if (mode === 'annual') {
          const v = targets[getKey(item.id, null)];
          if (v !== '' && v !== undefined) {
            ops.push(upsertTarget({ kpi_item_id: item.id, year, month: null, target_value: parseFloat(v) }));
          }
        } else {
          const v = targets[getKey(item.id, activeMonth)];
          if (v !== '' && v !== undefined) {
            ops.push(upsertTarget({ kpi_item_id: item.id, year, month: activeMonth, target_value: parseFloat(v) }));
          }
        }
      });
      await Promise.all(ops);
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
    cat, label: catLabel[cat], items: items.filter(i => i.category === cat),
  })).filter(g => g.items.length > 0);

  return (
    <div className="page-content">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, marginBottom: 4 }}>ตั้งค่าเป้าหมาย</h1>
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>กำหนด Target รายปี หรือรายเดือน สำหรับปี {year}</div>
      </div>

      {/* Mode toggle + Month selector */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', gap: 0, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border2)' }}>
          {['annual', 'monthly'].map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                padding: '8px 16px', border: 'none', fontSize: 13, fontWeight: 600,
                background: mode === m ? 'var(--accent)' : 'var(--bg3)',
                color: mode === m ? '#fff' : 'var(--text2)',
              }}
            >
              {m === 'annual' ? '📅 รายปี' : '📆 รายเดือน'}
            </button>
          ))}
        </div>

        {mode === 'monthly' && (
          <select
            value={activeMonth}
            onChange={e => setActiveMonth(+e.target.value)}
            style={{ width: 'auto', paddingRight: 32 }}
          >
            {MONTHS_TH.map((m, i) => (
              <option key={i + 1} value={i + 1}>{m} ({i + 1})</option>
            ))}
          </select>
        )}

        <button
          onClick={handleSave} disabled={saving}
          style={{
            padding: '9px 24px', borderRadius: 8,
            background: saved ? 'var(--green)' : 'var(--accent)',
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
                    <th style={{ width: '40%' }}>KPI</th>
                    <th style={{ width: '20%' }}>หน่วย</th>
                    <th>Target {mode === 'monthly' ? `(${MONTHS_TH[activeMonth - 1]})` : '(รายปี)'}</th>
                  </tr>
                </thead>
                <tbody>
                  {catItems.map(item => {
                    const key = getKey(item.id, mode === 'monthly' ? activeMonth : null);
                    return (
                      <tr key={item.id}>
                        <td style={{ fontWeight: 500 }}>
                          {item.name_th}
                          {item.source === 'gsheet' && <span style={{ fontSize: 10, color: 'var(--muted)', marginLeft: 6 }}>🔗 GSheet</span>}
                        </td>
                        <td style={{ color: 'var(--muted)' }}>{item.unit}</td>
                        <td>
                          <input
                            type="number" step="any"
                            value={targets[key] ?? ''}
                            onChange={e => setTargets(prev => ({ ...prev, [key]: e.target.value }))}
                            placeholder="ใส่ Target"
                            style={{ width: '100%', maxWidth: 160 }}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
