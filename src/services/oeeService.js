import { GSHEET_OEE_URL } from '../config';

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
  const buckets = {};
  for (let m = 1; m <= 12; m++) buckets[m] = { oees: [], defects: [] };

  rows.forEach(r => {
    const d = parseDate(r['วันที่ที่ผลิตงาน']);
    if (!d || d.year !== year) return;
    const oee = parseFloat(r['OEE']);
    const def = parseFloat(r['Defect']);
    if (!isNaN(oee) && oee > 0) {
      buckets[d.month].oees.push(oee <= 1 ? +(oee * 100).toFixed(2) : +oee.toFixed(2));
    }
    if (!isNaN(def) && def >= 0) {
      buckets[d.month].defects.push(+def.toFixed(2));
    }
  });

  return Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    const avg = arr => arr.length
      ? +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2)
      : null;
    return { month: m, oee: avg(buckets[m].oees), defect: avg(buckets[m].defects) };
  });
}
