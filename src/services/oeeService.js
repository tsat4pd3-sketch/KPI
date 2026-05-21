import { GSHEET_OEE_URL, OEE_LINES } from '../config';

let _rows = null;
let _ts = 0;
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

function parseCSV(text) {
  const lines = text.trim().split('\n');
  const headers = parseCSVLine(lines[0]);
  return lines.slice(1).filter(l => l.trim()).map(line => {
    const vals = parseCSVLine(line);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = vals[i] ?? ''; });
    return obj;
  });
}

function parseDate(val) {
  if (!val) return null;
  const m = val.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return null;
  let y = +m[3];
  if (y > 2500) y -= 543;
  return { year: y, month: +m[2] };
}

function lineBelongsTo(lineName, section) {
  const upper = (lineName || '').toUpperCase();
  return (OEE_LINES[section] || []).some(l => upper.includes(l.toUpperCase()));
}

async function getRows() {
  const now = Date.now();
  if (_rows && now - _ts < TTL) return _rows;
  const res = await fetch(GSHEET_OEE_URL);
  if (!res.ok) throw new Error('ไม่สามารถดึงข้อมูล OEE ได้ กรุณาตรวจสอบ Publish to web ใน Google Sheet');
  _rows = parseCSV(await res.text());
  _ts = now;
  return _rows;
}

export async function getOEEByYear(year) {
  const rows = await getRows();
  const b = {};
  for (let m = 1; m <= 12; m++) {
    b[m] = { oees_pd3: [], defs_pd3: [], oees_pd4: [], defs_pd4: [] };
  }

  rows.forEach(r => {
    const d = parseDate(r['วันที่ที่ผลิตงาน']);
    if (!d || d.year !== year) return;
    const line = r['เลือกไลน์การผลิต'] || '';
    const oee = parseFloat(r['OEE']);
    const def = parseFloat(r['Defect']);
    const isPD3 = lineBelongsTo(line, 'PD3');
    const isPD4 = lineBelongsTo(line, 'PD4');
    const toOEE = v => (v <= 1 ? +(v * 100).toFixed(2) : +v.toFixed(2));

    if (isPD3) {
      if (!isNaN(oee) && oee > 0) b[d.month].oees_pd3.push(toOEE(oee));
      if (!isNaN(def) && def >= 0) b[d.month].defs_pd3.push(+def.toFixed(2));
    }
    if (isPD4) {
      if (!isNaN(oee) && oee > 0) b[d.month].oees_pd4.push(toOEE(oee));
      if (!isNaN(def) && def >= 0) b[d.month].defs_pd4.push(+def.toFixed(2));
    }
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
