import { GSHEET_OEE_URL, GSHEET_OEE_PD4_URL, OEE_LINES } from '../config';

let _rowsPD3 = null;
let _rowsPD4 = null;
let _tsPD3 = 0;
let _tsPD4 = 0;
const TTL = 30 * 60 * 1000;

function parseCSVLine(line) {
  const result = [];
  let cur = '', inQ = false;
  for (const c of line) {
    if (c === '"') inQ = !inQ;
    else if (c === ',' && !inQ) { result.push(cur.trim()); cur = ''; }
    else cur += c;
  }
  result.push(cur.trim());
  return result;
}

function parseThaiDate(val) {
  if (!val) return null;
  const m = val.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return null;
  let y = +m[3];
  if (y > 2500) y -= 543;
  return { year: y, month: +m[2] };
}

function toOEEPct(v) {
  return v <= 1 ? +(v * 100).toFixed(2) : +v.toFixed(2);
}

async function getRowsPD3() {
  const now = Date.now();
  if (_rowsPD3 && now - _tsPD3 < TTL) return _rowsPD3;
  const res = await fetch(GSHEET_OEE_URL + '&t=' + now);
  if (!res.ok) throw new Error('ไม่สามารถดึงข้อมูล OEE PD3 ได้ กรุณาตรวจสอบ Publish to web ใน Google Sheet');
  const text = await res.text();
  const lines = text.trim().split('\n');
  const headers = parseCSVLine(lines[0]);
  _rowsPD3 = lines.slice(1).filter(l => l.trim()).map(line => {
    const vals = parseCSVLine(line);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = vals[i] ?? ''; });
    return obj;
  });
  _tsPD3 = now;
  return _rowsPD3;
}

async function getRowsPD4() {
  const now = Date.now();
  if (_rowsPD4 && now - _tsPD4 < TTL) return _rowsPD4;
  const res = await fetch(GSHEET_OEE_PD4_URL + '&t=' + now);
  if (!res.ok) throw new Error('ไม่สามารถดึงข้อมูล OEE PD4 ได้ กรุณาตรวจสอบ Publish to web ใน Google Sheet');
  const text = await res.text();
  const lines = text.trim().split('\n').filter(l => l.trim());
  // Skip header row; return raw column arrays for index-based parsing
  _rowsPD4 = lines.slice(1).map(l => parseCSVLine(l));
  _tsPD4 = now;
  return _rowsPD4;
}

function lineBelongsTo(lineName, section) {
  const upper = (lineName || '').toUpperCase();
  return (OEE_LINES[section] || []).some(l => upper.includes(l.toUpperCase()));
}

export async function getOEEByYear(year) {
  const [rowsPD3, rowsPD4] = await Promise.all([getRowsPD3(), getRowsPD4()]);

  const b = {};
  for (let m = 1; m <= 12; m++) {
    b[m] = { oees_pd3: [], defs_pd3: [], oees_pd4: [], defs_pd4: [] };
  }

  rowsPD3.forEach(r => {
    const d = parseThaiDate(r['วันที่ที่ผลิตงาน']);
    if (!d || d.year !== year) return;
    const line = r['เลือกไลน์การผลิต'] || '';
    if (!lineBelongsTo(line, 'PD3')) return;
    const oee = parseFloat(r['OEE']);
    const def = parseFloat(r['Defect']);
    if (!isNaN(oee) && oee > 0) b[d.month].oees_pd3.push(toOEEPct(oee));
    if (!isNaN(def) && def >= 0) b[d.month].defs_pd3.push(+def.toFixed(2));
  });

  // PD4 uses column-index-based parsing (mirrors overview.html parsePD4)
  rowsPD4.forEach(row => {
    const part = (row[1] || '').toUpperCase();
    if (!['GOR', 'LWRBAR', 'LWR BAR'].some(p => part.includes(p))) return;
    const d = parseThaiDate(row[59] || row[0] || '');
    if (!d || d.year !== year) return;
    const oee = parseFloat(row[83]);
    // Defect: 3 possible defect slots, each with flag@7+i*4, type@8+i*4, qty@9+i*4
    let def = 0;
    for (let i = 0; i < 3; i++) {
      const flag = (row[7 + i * 4] || '').toUpperCase();
      if (flag === 'TRUE' || flag === '1') {
        const qty = parseFloat(row[9 + i * 4]);
        if (!isNaN(qty) && qty > 0) def += qty;
      }
    }
    if (!isNaN(oee) && oee > 0) b[d.month].oees_pd4.push(toOEEPct(oee));
    b[d.month].defs_pd4.push(+def.toFixed(2));
  });

  const avg = arr => arr.length ? +(arr.reduce((a, c) => a + c, 0) / arr.length).toFixed(2) : null;
  return Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    return {
      month: m,
      oee_pd3:    avg(b[m].oees_pd3),
      defect_pd3: avg(b[m].defs_pd3),
      oee_pd4:    avg(b[m].oees_pd4),
      defect_pd4: avg(b[m].defs_pd4),
    };
  });
}
