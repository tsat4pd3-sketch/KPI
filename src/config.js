export const GSHEET_OEE_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vToehKwHXa32rnaE008gbSZ795A_2tpe4mgEsPECNX9-o5gv7aFfNWBZnxoVdvrqmylqv7bjg26PXHY/pub?gid=2011515171&single=true&output=csv';

export const CATEGORY_META = {
  financial: { label: 'Financial',        labelTH: 'การเงิน',      icon: '💰', color: '#4d9fff' },
  customer:  { label: 'Customer',         labelTH: 'ลูกค้า',        icon: '⭐', color: '#22c55e' },
  internal:  { label: 'Internal Process', labelTH: 'กระบวนการ',     icon: '⚙️', color: '#f59e0b' },
  growth:    { label: 'Growth',           labelTH: 'การเติบโต',     icon: '📈', color: '#a855f7' },
};

export const MONTHS_TH = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
];

// Items where lower actual value = better performance
export const LOWER_BETTER = ['Direct Labor', 'Overhead', 'Safety', 'Defect PPM', 'Inventory Balance'];

export function isLowerBetter(item) {
  return LOWER_BETTER.includes(item.name_en);
}

export function calcAchievement(item, actual, target) {
  if (actual == null || target == null) return null;
  if (item.name_en === 'Safety' && target === 0) return actual === 0 ? 100 : 0;
  if (target === 0) return actual === 0 ? 100 : 0;
  const lb = isLowerBetter(item);
  const raw = lb ? (target / actual) * 100 : (actual / target) * 100;
  return Math.min(Math.round(raw * 10) / 10, 100);
}

export function achievementColor(pct) {
  if (pct == null) return 'var(--muted)';
  if (pct >= 90) return '#22c55e';
  if (pct >= 70) return '#f59e0b';
  return '#e74c3c';
}
