export const GSHEET_OEE_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vToehKwHXa32rnaE008gbSZ795A_2tpe4mgEsPECNX9-o5gv7aFfNWBZnxoVdvrqmylqv7bjg26PXHY/pub?gid=2011515171&single=true&output=csv';

export const CATEGORY_META = {
  financial: { label: 'Financial',        labelTH: 'การเงิน',      icon: '💰', color: '#4d9fff' },
  customer:  { label: 'Customer',         labelTH: 'ลูกค้า',        icon: '⭐', color: '#22c55e' },
  internal:  { label: 'Internal Process', labelTH: 'กระบวนการ',     icon: '⚙️', color: '#f59e0b' },
  growth:    { label: 'Growth',           labelTH: 'การเติบโต',     icon: '📈', color: '#a855f7' },
};

export const SECTIONS = ['ALL', 'PD3', 'PD4', 'JIG'];

export const SECTION_COLORS = {
  PD3: '#4d9fff',
  PD4: '#22c55e',
  JIG: '#f59e0b',
  ALL: '#a8a8a8',
};

// Production line names per section (from production_lines table)
export const OEE_LINES = {
  PD3: ['HYDROFORM', 'LINE APRON ASSY'],
  PD4: ['GOR', 'LWR BAR'],
};

export const MONTHS_TH = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
];

export function calcAchievement(item, actual, target) {
  if (actual == null || target == null) return null;
  // Safety: target 0 = zero accidents goal
  if (item.unit === 'Case' && target === 0) return actual === 0 ? 100 : 0;
  if (target === 0) return actual === 0 ? 100 : 0;
  const lb = item.lower_better;
  const raw = lb ? (target / actual) * 100 : (actual / target) * 100;
  return Math.min(Math.round(raw * 10) / 10, 100);
}

export function achievementColor(pct) {
  if (pct == null) return 'var(--muted)';
  if (pct >= 90) return '#22c55e';
  if (pct >= 70) return '#f59e0b';
  return '#e74c3c';
}

const salesFields = (secLabel) => [
  { key: 'sales_total',    label: 'ยอดขายรวมโรงงาน (Baht)' },
  { key: 'sales_division', label: `ยอดขาย ${secLabel} Division (Baht)` },
];
const dlFields = [
  { key: 'dl_salary',  label: 'DL Salary (Baht)' },
  { key: 'dl_ot',      label: 'DL Overtime (Baht)' },
  { key: 'dl_bonus',   label: 'DL Bonus (Baht)' },
];
const ohFields = [
  { key: 'oh_usage',      label: 'OH Usage (Baht)' },
  { key: 'oh_spare_part', label: 'OH Spare Part (Baht)' },
  { key: 'oh_repair',     label: 'OH Repair (Baht)' },
  { key: 'oh_other',      label: 'OH Other (Baht)' },
];
const growthFields = (secLabel) => [
  { key: 'manpower_section',   label: `Headcount ${secLabel}`, integer: true },
  { key: 'course_trained_count', label: 'Courses Completed (เดือนนี้)', integer: true },
  { key: 'course_plan_annual', label: 'Annual Course Plan (รวมทั้งปี)', integer: true },
];

export const RAW_FIELD_GROUPS = {
  PD3: [
    { group: 'ยอดขาย',         fields: salesFields('PD3') },
    { group: 'Direct Labour',  fields: dlFields },
    { group: 'Overhead',       fields: ohFields },
    { group: '100P & Inventory', fields: [
      { key: 'p100_amount',        label: '100P&CR Amount (Baht)' },
      { key: 'inventory_balance',  label: 'Inventory Balance (Baht)' },
    ]},
    { group: 'Growth',         fields: growthFields('PD3') },
  ],
  PD4: [
    { group: 'ยอดขาย',         fields: salesFields('PD4') },
    { group: 'Direct Labour',  fields: dlFields },
    { group: 'Overhead',       fields: ohFields },
    { group: '100P & Inventory', fields: [
      { key: 'p100_amount',        label: '100P&CR Amount (Baht)' },
      { key: 'inventory_balance',  label: 'Inventory Balance (Baht)' },
    ]},
    { group: 'Growth',         fields: growthFields('PD4') },
  ],
  JIG: [
    { group: 'ยอดขาย',   fields: salesFields('JIG') },
    { group: 'Direct Labour', fields: dlFields },
    { group: 'Overhead',      fields: ohFields },
    { group: '100P',          fields: [
      { key: 'p100_amount', label: '100P&CR Amount (Baht)' },
    ]},
    { group: 'Growth', fields: growthFields('JIG') },
  ],
  ALL: [
    { group: 'Customer Satisfaction', fields: [
      { key: 'cust_sat_q', label: 'Quality Score (%)' },
      { key: 'cust_sat_d', label: 'Delivery Score (%)' },
    ]},
  ],
};

export function formatValue(item, val) {
  if (val == null) return '—';
  if (item.unit === '%') return `${Number(val).toFixed(2)}%`;
  if (item.unit === 'PPM') return `${Math.round(val)} PPM`;
  if (item.unit === 'Mb') return `${Number(val).toFixed(3)} Mb`;
  if (item.unit === 'min') return `${Math.round(val)} min`;
  if (item.unit === 'ratio') return Number(val).toFixed(3);
  if (item.unit === 'Case') return `${val} Case`;
  return String(val);
}
