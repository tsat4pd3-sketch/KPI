export const DEFAULT_AGENTS = [
  { id:'oee',         name:'OEE Monitor',       role:'ติดตาม OEE',          type:'robot',    color:'#60a5fa', kpi:'OEE',              value:87.3, target:85,  unit:'%', speed:1.2, messages:['OEE อยู่ที่ 87.3%! ✅','Availability 92%','Performance 95%','Quality 99.5%'] },
  { id:'quality',     name:'Quality Inspector', role:'ตรวจสอบคุณภาพ', type:'robot',    color:'#c084fc', kpi:'Quality Rate',     value:99.5, target:99,  unit:'%', speed:0.8, messages:['คุณภาพผ่าน 99.5%! ✅','NG Rate: 0.5%','กำลังตรวจ lot #42','Complaint: 0'] },
  { id:'maintenance', name:'Maintenance',        role:'งานซ่อมบำรุง',      type:'engineer', color:'#fb923c', kpi:'PM Compliance',    value:94.0, target:90,  unit:'%', speed:1.0, messages:['PM ครบ 94%! ✅','MTBF: 720 ชม.','MTTR: 2.1 ชม.','PM เสร็จ 3/3'] },
  { id:'finance',     name:'Cost Manager',       role:'ควบคุมต้นทุน',      type:'manager',  color:'#f87171', kpi:'Cost Variance',    value:-3.2, target:0,   unit:'%', speed:1.5, messages:['ต้นทุนเกิน 3.2%! ⚠️','Budget: 2.1M','Actual: 2.17M','กำลังวิเคราะห์...'] },
  { id:'delivery',    name:'Delivery Agent',     role:'ส่งมอบตรงเวลา',   type:'engineer', color:'#34d399', kpi:'On-Time Delivery', value:96.8, target:95,  unit:'%', speed:0.9, messages:['OTD: 96.8%! ✅','Shipment 24/25','Delay: 1 lot','กำลัง track order'] },
  { id:'safety',      name:'Safety Officer',     role:'ความปลอดภัย',       type:'manager',  color:'#fbbf24', kpi:'Safety Score',     value:100,  target:100, unit:'%', speed:0.7, messages:['0 อุบัติเหตุ! ✅','Near miss: 0','PPE ครบ 100%','45 วันปลอดภัย'] },
];

export function loadAgents() {
  try {
    const s = localStorage.getItem('kpi-agents');
    if (s) return JSON.parse(s);
  } catch {}
  return DEFAULT_AGENTS;
}
