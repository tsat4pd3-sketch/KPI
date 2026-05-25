export const GSHEET_OEE_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vToehKwHXa32rnaE008gbSZ795A_2tpe4mgEsPECNX9-o5gv7aFfNWBZnxoVdvrqmylqv7bjg26PXHY/pub?gid=2011515171&single=true&output=csv';

export const GSHEET_OEE_PD4_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vSs034o0M970g62tL1jkU4CU6HpAbVkER87uw3OzI97ueA6xXdBdwXd1Gcd0GrgaKOuIrTl-F75q3nz/pub?gid=122174819&single=true&output=csv';

export const CATEGORY_META = {
  financial: { label: 'Financial',        labelTH: 'การเงิน',    icon: '💰', color: '#4d9fff' },
  customer:  { label: 'Customer',         labelTH: 'ลูกค้า',      icon: '⭐', color: '#22c55e' },
  internal:  { label: 'Internal Process', labelTH: 'กระบวนการ',   icon: '⚙️', color: '#f59e0b' },
  growth:    { label: 'Growth',           labelTH: 'การเติบโต',   icon: '📈', color: '#a855f7' },
};

export const SECTIONS = ['ALL', 'PD3', 'PD4', 'JIG'];

export const SECTION_COLORS = {
  PD3: '#1a6d2e',
  PD4: '#e87c1e',
  JIG: '#b45309',
  ALL: '#6a8a6d',
};

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
  if (item.unit === 'Case' && target === 0) return actual === 0 ? 100 : 0;
  if (item.unit === 'team') {
    if (target <= 0) return null;
    return actual >= target ? 100 : Math.round(actual / target * 1000) / 10;
  }
  if (target === 0) return actual === 0 ? 100 : 0;
  const lb = item.lower_better;
  const raw = lb ? (target / actual) * 100 : (actual / target) * 100;
  return Math.min(Math.round(raw * 10) / 10, 100);
}

export function achievementColor(pct) {
  if (pct == null) return 'var(--muted)';
  if (pct >= 90) return 'var(--green)';
  if (pct >= 70) return 'var(--amber)';
  return 'var(--red)';
}

// ─── Raw field definitions ────────────────────────────────────────────────────
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
const p100Field = { key: 'p100_amount', label: '100P & Customer Returns — มูลค่ารวม (Baht)' };

const safetySubFields = [
  { key: 'acc_absent_3d_plus',  label: 'Absent Accidents > 3 Days (case)', integer: true },
  { key: 'acc_absent_3d_minus', label: 'Absent Accidents < 3 Days (case)', integer: true },
  { key: 'acc_minor',           label: 'Minor Injuries (case)',             integer: true },
  { key: 'acc_fire',            label: 'Fire / Injury Accidents (case)',    integer: true },
];

const qccFields = [
  { key: 'qcc_qualified', label: 'QCC Teams Qualified (กลุ่ม)', integer: true },
  { key: 'qcc_total',     label: 'QCC Teams Total (กลุ่ม)',     integer: true },
];

const engDayFields = [
  { key: 'eng_day_teams', label: 'Engineering Day Teams (ทีม)',      integer: true },
  { key: 'eng_day_types', label: 'Engineering Day Types (≥3 ประเภท)', integer: true },
];

const planSectionFields = (secLabel) => [
  { key: 'plan_sales_division', label: `PLAN Product SALE ${secLabel} (Baht)` },
  { key: 'plan_dl',             label: 'PLAN DL (Baht)' },
  { key: 'plan_oh',             label: 'PLAN OH (Baht)' },
  { key: 'plan_100p',           label: 'Plan 100P — Cost Reduction Target (Baht)' },
];

export const RAW_FIELD_GROUPS = {
  PD3: [
    { group: 'Plan (งบประมาณเดือนนี้)', fields: planSectionFields('PD3') },
    { group: 'ยอดขาย & วัตถุดิบ (Actual)', fields: [
      { key: 'sales_division', label: 'ACTUAL Product SALE PD3 Division (Baht)' },
      { key: 'material_cost',  label: 'Material Cost — ต้นทุนวัตถุดิบ (Baht)' },
    ]},
    { group: 'Direct Labour (Actual)',  fields: dlFields },
    { group: 'Overhead (Actual)',       fields: ohFields },
    { group: '100P & Inventory (Actual)', fields: [
      p100Field,
      { key: 'inventory_p410', label: 'Inventory Balance — P410 Line (Baht)' },
      { key: 'inventory_p412', label: 'Inventory Balance — P412 Line (Baht)' },
    ]},
    { group: 'Safety — sub-types (Drill-down)', fields: safetySubFields },
    { group: 'ISO Non NC Major', fields: [
      { key: 'iso_nc_major', label: 'Non NC Major ISO (จำนวน case)', integer: true },
    ]},
    { group: 'Internal Defect (PPM)', fields: [
      { key: 'ppm_defect',     label: 'Defect Parts (pcs)',       integer: true },
      { key: 'ppm_production', label: 'Total Production (pcs)',   integer: true },
    ]},
    { group: 'Growth — QCC & Engineering Day', fields: [...qccFields, ...engDayFields] },
    { group: 'Growth — Manpower & Training', fields: [
      { key: 'manpower_section',     label: 'ACTUAL Man PD3 (Permanent + Outsource)', integer: true },
      { key: 'training_headcount',   label: 'Training (man) — จำนวนคนที่ได้รับการอบรม', integer: true },
      { key: 'course_trained_count', label: 'Courses Completed (จำนวน course)',        integer: true },
      { key: 'course_plan_annual',   label: 'Annual Course Plan (รวมทั้งปี)',           integer: true },
    ]},
  ],
  PD4: [
    { group: 'Plan (งบประมาณเดือนนี้)', fields: planSectionFields('PD4') },
    { group: 'ยอดขาย & วัตถุดิบ (Actual)', fields: [
      { key: 'sales_division', label: 'ACTUAL Product SALE PD4 Division (Baht)' },
      { key: 'material_cost',  label: 'Material Cost — ต้นทุนวัตถุดิบ (Baht)' },
    ]},
    { group: 'Direct Labour (Actual)',  fields: dlFields },
    { group: 'Overhead (Actual)',       fields: ohFields },
    { group: '100P & Inventory (Actual)', fields: [
      p100Field,
      { key: 'inventory_p410', label: 'Inventory Balance — P410 Line (Baht)' },
      { key: 'inventory_p412', label: 'Inventory Balance — P412 Line (Baht)' },
    ]},
    { group: 'Safety — sub-types (Drill-down)', fields: safetySubFields },
    { group: 'ISO Non NC Major', fields: [
      { key: 'iso_nc_major', label: 'Non NC Major ISO (จำนวน case)', integer: true },
    ]},
    { group: 'Internal Defect (PPM)', fields: [
      { key: 'ppm_defect',     label: 'Defect Parts (pcs)',     integer: true },
      { key: 'ppm_production', label: 'Total Production (pcs)', integer: true },
    ]},
    { group: 'Growth — QCC & Engineering Day', fields: [...qccFields, ...engDayFields] },
    { group: 'Growth — Manpower & Training', fields: [
      { key: 'manpower_section',     label: 'ACTUAL Man PD4 (Permanent + Outsource)', integer: true },
      { key: 'training_headcount',   label: 'Training (man) — จำนวนคนที่ได้รับการอบรม', integer: true },
      { key: 'course_trained_count', label: 'Courses Completed (จำนวน course)',        integer: true },
      { key: 'course_plan_annual',   label: 'Annual Course Plan (รวมทั้งปี)',           integer: true },
    ]},
  ],
  JIG: [
    { group: 'Plan (งบประมาณเดือนนี้)', fields: planSectionFields('JIG') },
    { group: 'ยอดขาย Division (Actual)', fields: [
      { key: 'sales_division', label: 'ACTUAL Product SALE JIG Division (Baht)' },
    ]},
    { group: 'Direct Labour (Actual)', fields: dlFields },
    { group: 'Overhead (Actual)',      fields: ohFields },
    { group: '100P (Actual)', fields: [p100Field] },
    { group: 'MO Tracking', fields: [
      { key: 'mo_closed', label: 'MO Closed on Target (count)', integer: true },
      { key: 'mo_total',  label: 'MO Total (count)',            integer: true },
    ]},
    { group: 'Safety — sub-types (Drill-down)', fields: safetySubFields },
    { group: 'ISO Non NC Major', fields: [
      { key: 'iso_nc_major', label: 'Non NC Major ISO (จำนวน case)', integer: true },
    ]},
    { group: 'MTBF & MTTR', fields: [
      { key: 'mtbf_uptime',      label: 'Total Uptime (min)' },
      { key: 'mttr_repair_time', label: 'Total Repair Time (min)' },
      { key: 'breakdown_count',  label: 'Breakdown Count (times)', integer: true },
    ]},
    { group: 'Preventive Maintenance', fields: [
      { key: 'pm_completed', label: 'PM Completed (tasks)', integer: true },
      { key: 'pm_planned',   label: 'PM Planned (tasks)',   integer: true },
    ]},
    { group: 'Growth — QCC & Engineering Day', fields: [...qccFields, ...engDayFields] },
    { group: 'Growth — Manpower & Training', fields: [
      { key: 'manpower_section',     label: 'ACTUAL Man JIG (Permanent + Outsource)', integer: true },
      { key: 'training_headcount',   label: 'Training (man) — จำนวนคนที่ได้รับการอบรม', integer: true },
      { key: 'course_trained_count', label: 'Courses Completed (จำนวน course)',        integer: true },
      { key: 'course_plan_annual',   label: 'Annual Course Plan (รวมทั้งปี)',           integer: true },
    ]},
  ],
  ALL: [
    { group: 'Plan รวมโรงงาน (งบประมาณเดือนนี้)', fields: [
      { key: 'plan_sales_total',  label: 'PLAN TOTAL SALE (Baht)' },
      { key: 'plan_manpower_fac', label: 'PLAN Man Fac (Headcount)', integer: true },
    ]},
    { group: 'Actual รวมโรงงาน (ใช้คำนวณ DL%/OH% ทุกแผนก)', fields: [
      { key: 'sales_total',         label: 'ACTUAL TOTAL SALE — ACT PRODUCT SALES (Baht)' },
      { key: 'manpower_total',      label: 'ACTUAL Man Fac (Permanent + Outsource)',        integer: true },
      { key: 'p100_amount_factory', label: 'Actual 100P+CR Factory — มูลค่ารวมโรงงาน (Baht)' },
    ]},
    { group: 'Customer Satisfaction', fields: [
      { key: 'cust_sat_q', label: 'Quality Score (%)' },
      { key: 'cust_sat_d', label: 'Delivery Score (%)' },
    ]},
  ],
};

export function formatValue(item, val) {
  if (val == null) return '—';
  if (item.unit === '%')    return `${Number(val).toFixed(2)}%`;
  if (item.unit === 'PPM')  return `${Math.round(val)} PPM`;
  if (item.unit === 'Mb')   return `${Number(val).toFixed(3)} Mb`;
  if (item.unit === 'min')  return `${Math.round(val)} min`;
  if (item.unit === 'ratio') return Number(val).toFixed(3);
  if (item.unit === 'Case') return `${val} Case`;
  if (item.unit === 'Baht') return `฿${Number(val).toLocaleString('th-TH', { maximumFractionDigits: 0 })}`;
  if (item.unit === 'team') return `${val} team${Number(val) !== 1 ? 's' : ''}`;
  return String(val);
}
