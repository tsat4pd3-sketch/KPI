import { supabase } from '../supabaseClient';
import { upsertActual } from './kpiService';

export async function getRawInputs(year) {
  const { data, error } = await supabase
    .from('kpi_raw_inputs').select('*').eq('year', year);
  if (error) throw error;
  return data ?? [];
}

export async function getRawInput(year, month, section) {
  const { data, error } = await supabase
    .from('kpi_raw_inputs').select('*')
    .eq('year', year).eq('month', month).eq('section', section)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function saveRawInputAndCompute(rawRecord, items, yearRaws) {
  const { year, month, section } = rawRecord;

  const { error } = await supabase
    .from('kpi_raw_inputs')
    .upsert({ ...rawRecord, updated_at: new Date().toISOString() },
      { onConflict: 'year,month,section' });
  if (error) throw error;

  const updatedRaws = [
    ...yearRaws.filter(r => !(r.section === section && r.month === month)),
    rawRecord,
  ];

  const computed = computeActuals(rawRecord, items, updatedRaws, month);
  await Promise.all(
    Object.entries(computed).map(([kpi_item_id, val]) =>
      upsertActual({ kpi_item_id, year, month, actual_value: +val.toFixed(6), note: '' })
    )
  );

  if (section === 'ALL') {
    const siblings = updatedRaws.filter(r =>
      ['PD3', 'PD4', 'JIG'].includes(r.section) && r.year === year && r.month === month
    );
    for (const sib of siblings) {
      const sibComputed = computeActuals(sib, items, updatedRaws, month);
      if (Object.keys(sibComputed).length > 0) {
        await Promise.all(
          Object.entries(sibComputed).map(([kpi_item_id, val]) =>
            upsertActual({ kpi_item_id, year, month, actual_value: +val.toFixed(6), note: '' })
          )
        );
      }
    }
  }

  return updatedRaws;
}

// ─── Section detail CRUD (drill-down sub-items) ────────────────────────────────
export async function getSectionDetails(year, month, section) {
  const { data, error } = await supabase
    .from('kpi_section_detail').select('*')
    .eq('year', year).eq('month', month).eq('section', section);
  if (error) throw error;
  return data ?? [];
}

export async function saveSectionDetail({ kpi_item_id, year, month, section, sub_label, actual_value, note }) {
  const { error } = await supabase
    .from('kpi_section_detail')
    .upsert(
      { kpi_item_id, year, month, section, sub_label, actual_value, note, updated_at: new Date().toISOString() },
      { onConflict: 'kpi_item_id,year,month,section,sub_label' }
    );
  if (error) throw error;
}

// ─── computeActuals ───────────────────────────────────────────────────────────
export function computeActuals(raw, items, allRaws, month) {
  if (!raw) return {};
  const res = {};
  const findId = (no) => items.find(i => i.kpi_no === no)?.id;
  const sec = raw.section;
  const yr  = raw.year;

  if (sec !== 'ALL') {
    const dlTotal = (raw.dl_salary || 0) + (raw.dl_ot || 0) + (raw.dl_bonus || 0);
    const ohTotal = (raw.oh_usage || 0) + (raw.oh_spare_part || 0) + (raw.oh_repair || 0) + (raw.oh_other || 0);

    const factoryRaw = allRaws?.find(r => r.section === 'ALL' && r.year === yr && r.month === month);
    const salesTotal = factoryRaw?.sales_total || raw.sales_total || 0;

    if (salesTotal > 0) {
      const dlNo = sec === 'PD3' ? '1.1' : sec === 'PD4' ? '1.3' : '1.5';
      const ohNo = sec === 'PD3' ? '1.2' : sec === 'PD4' ? '1.4' : '1.6';
      if (findId(dlNo)) res[findId(dlNo)] = dlTotal / salesTotal * 100;
      if (findId(ohNo)) res[findId(ohNo)] = ohTotal / salesTotal * 100;
    }

    if ((raw.sales_division || 0) > 0) {
      // 100P
      const p100No = sec === 'PD3' ? '3.1a' : sec === 'PD4' ? '3.1b' : '3.1c';
      if (findId(p100No) && raw.p100_amount != null)
        res[findId(p100No)] = raw.p100_amount / raw.sales_division * 100;

      // Inventory (PD3 / PD4 only)
      if (sec !== 'JIG') {
        const invNo  = sec === 'PD3' ? '3.2' : '3.3';
        const invTotal = (raw.inventory_p410 || 0) + (raw.inventory_p412 || 0);
        if (findId(invNo) && invTotal > 0)
          res[findId(invNo)] = invTotal / raw.sales_division;
      }

      // Raw Material Control (PD3 / PD4 only)
      if (sec !== 'JIG') {
        const rmNo = sec === 'PD3' ? '1.0a' : '1.0b';
        if (findId(rmNo) && raw.material_cost != null)
          res[findId(rmNo)] = raw.material_cost / raw.sales_division * 100;
      }
    }

    // PPM + OEE manual fallback
    if (['PD3', 'PD4'].includes(sec)) {
      const ppmNo = sec === 'PD3' ? '3.4' : '3.5';
      const ppmId = findId(ppmNo);
      if (ppmId && (raw.ppm_production || 0) > 0 && raw.ppm_defect != null)
        res[ppmId] = raw.ppm_defect / raw.ppm_production * 1e6;

      // OEE manual fallback — written to kpi_actuals; GSheet overlay takes precedence when available
      const oeeNo        = sec === 'PD3' ? '3.6' : '3.7';
      const oeeManualKey = sec === 'PD3' ? 'oee_pd3_manual' : 'oee_pd4_manual';
      const oeeId        = findId(oeeNo);
      if (oeeId && raw[oeeManualKey] != null)
        res[oeeId] = raw[oeeManualKey];
    }

    // JIG-specific
    if (sec === 'JIG') {
      // MTBF
      const btId = findId('3.8');
      if (btId && (raw.breakdown_count || 0) > 0 && raw.mtbf_uptime != null)
        res[btId] = raw.mtbf_uptime / raw.breakdown_count;

      // MTTR
      const trId = findId('3.9');
      if (trId && (raw.breakdown_count || 0) > 0 && raw.mttr_repair_time != null)
        res[trId] = raw.mttr_repair_time / raw.breakdown_count;

      // PM
      const pmId = findId('4.0');
      if (pmId && (raw.pm_planned || 0) > 0 && raw.pm_completed != null)
        res[pmId] = raw.pm_completed / raw.pm_planned * 100;

      // Machine Break Down %
      const totalTime = (raw.mtbf_uptime || 0) + (raw.mttr_repair_time || 0);
      const bdId = findId('3.2c');
      if (bdId && totalTime > 0)
        res[bdId] = (raw.mttr_repair_time || 0) / totalTime * 100;

      // MO Closed on Target
      const moId = findId('2.2c');
      if (moId && (raw.mo_total || 0) > 0 && raw.mo_closed != null)
        res[moId] = raw.mo_closed / raw.mo_total * 100;
    }

    // QCC (all sections)
    const qccNo = sec === 'PD3' ? '4.3a2' : sec === 'PD4' ? '4.3b2' : '4.3c2';
    const qccId = findId(qccNo);
    if (qccId && (raw.qcc_total || 0) > 0 && raw.qcc_qualified != null)
      res[qccId] = raw.qcc_qualified / raw.qcc_total * 100;

    // Engineering Day (all sections) — teams count
    const edNo = sec === 'PD3' ? '4.4a' : sec === 'PD4' ? '4.4b' : '4.4c';
    const edId = findId(edNo);
    if (edId && raw.eng_day_teams != null)
      res[edId] = raw.eng_day_teams;

    // Non NC Major ISO (all sections)
    const ncNo = sec === 'PD3' ? '3.6a' : sec === 'PD4' ? '3.6b' : '3.6c';
    const ncId = findId(ncNo);
    if (ncId && raw.iso_nc_major != null)
      res[ncId] = raw.iso_nc_major;

    // Serious Accidents — computed from acc_serious raw field
    const accNo = sec === 'PD3' ? '4.1a' : sec === 'PD4' ? '4.1b' : '4.1c';
    const accId = findId(accNo);
    if (accId && raw.acc_serious != null)
      res[accId] = raw.acc_serious;

    // Sales / Head — cumulative YTD
    const shNo = sec === 'PD3' ? '4.2a' : sec === 'PD4' ? '4.2b' : '4.2c';
    const shId = findId(shNo);
    if (shId && (raw.manpower_section || 0) > 0) {
      const cumSales = allRaws
        .filter(r => r.section === sec && r.year === yr && r.month <= month)
        .reduce((s, r) => s + (r.sales_division || 0), 0);
      res[shId] = cumSales / raw.manpower_section / 1e6;
    }

    // TS Academy — cumulative YTD
    const tsNo = sec === 'PD3' ? '4.3a' : sec === 'PD4' ? '4.3b' : '4.3c';
    const tsId = findId(tsNo);
    if (tsId && (raw.course_plan_annual || 0) > 0) {
      const cumTrained = allRaws
        .filter(r => r.section === sec && r.year === yr && r.month <= month)
        .reduce((s, r) => s + (r.course_trained_count || 0), 0);
      res[tsId] = cumTrained / raw.course_plan_annual * 100;
    }
  } else {
    // ALL: Customer Satisfaction
    const csId = findId('2.1');
    if (csId && raw.cust_sat_q != null && raw.cust_sat_d != null)
      res[csId] = (raw.cust_sat_q + raw.cust_sat_d) / 2;

    // ALL: Factory 100P
    const p100FacId = findId('3.1');
    if (p100FacId && raw.p100_amount_factory != null && (raw.sales_total || 0) > 0)
      res[p100FacId] = raw.p100_amount_factory / raw.sales_total * 100;
  }

  return res;
}

// ─── buildDrillDown ───────────────────────────────────────────────────────────
export function buildDrillDown(item, raw, allRaws) {
  if (!raw || !item) return null;
  const no  = item.kpi_no;
  const fmt  = (v) => v == null ? '—' : Number(v).toLocaleString('th-TH', { maximumFractionDigits: 2 });
  const fmtB = (v) => v == null ? '—' : '฿' + Number(v).toLocaleString('th-TH', { maximumFractionDigits: 0 });

  // DL %
  if (['1.1', '1.3', '1.5'].includes(no)) {
    const dl = (raw.dl_salary || 0) + (raw.dl_ot || 0) + (raw.dl_bonus || 0);
    const factoryRaw    = allRaws?.find(r => r.section === 'ALL' && r.year === raw.year && r.month === raw.month);
    const factorySales  = factoryRaw?.sales_total ?? raw.sales_total ?? 0;
    return {
      title: 'Direct Labour Cost',
      rows: [
        ['DL Salary',  fmtB(raw.dl_salary)],
        ['DL Overtime', fmtB(raw.dl_ot)],
        ['DL Bonus',    fmtB(raw.dl_bonus)],
        ['—', '—'],
        ['Total DL',            fmtB(dl)],
        ['Factory Sales (รวมโรงงาน)', fmtB(factorySales)],
      ],
      formula: factorySales > 0
        ? `DL% = ${fmtB(dl)} / ${fmtB(factorySales)} × 100 = ${(dl / factorySales * 100).toFixed(4)}%`
        : null,
    };
  }

  // OH %
  if (['1.2', '1.4', '1.6'].includes(no)) {
    const oh = (raw.oh_usage || 0) + (raw.oh_spare_part || 0) + (raw.oh_repair || 0) + (raw.oh_other || 0);
    const factoryRaw   = allRaws?.find(r => r.section === 'ALL' && r.year === raw.year && r.month === raw.month);
    const factorySales = factoryRaw?.sales_total ?? raw.sales_total ?? 0;
    return {
      title: 'Overhead Cost',
      rows: [
        ['OH Usage',      fmtB(raw.oh_usage)],
        ['OH Spare Part', fmtB(raw.oh_spare_part)],
        ['OH Repair',     fmtB(raw.oh_repair)],
        ['OH Other',      fmtB(raw.oh_other)],
        ['—', '—'],
        ['Total OH',              fmtB(oh)],
        ['Factory Sales (รวมโรงงาน)', fmtB(factorySales)],
      ],
      formula: factorySales > 0
        ? `OH% = ${fmtB(oh)} / ${fmtB(factorySales)} × 100 = ${(oh / factorySales * 100).toFixed(4)}%`
        : null,
    };
  }

  // Raw Material Control
  if (['1.0a', '1.0b'].includes(no)) {
    return {
      title: 'Raw Material Control',
      rows: [
        ['Material Cost',   fmtB(raw.material_cost)],
        ['Division Sales',  fmtB(raw.sales_division)],
      ],
      formula: (raw.sales_division || 0) > 0 && raw.material_cost != null
        ? `Material% = ${fmtB(raw.material_cost)} / ${fmtB(raw.sales_division)} × 100 = ${(raw.material_cost / raw.sales_division * 100).toFixed(4)}%`
        : null,
    };
  }

  // Customer Satisfaction
  if (no === '2.1') {
    return {
      title: 'Customer Satisfaction',
      rows: [
        ['Quality Score',  fmt(raw.cust_sat_q) + '%'],
        ['Delivery Score', fmt(raw.cust_sat_d) + '%'],
      ],
      formula: raw.cust_sat_q != null && raw.cust_sat_d != null
        ? `Average = (${raw.cust_sat_q} + ${raw.cust_sat_d}) / 2 = ${((raw.cust_sat_q + raw.cust_sat_d) / 2).toFixed(2)}%`
        : null,
    };
  }

  // MO Closed on Target (JIG)
  if (no === '2.2c') {
    return {
      title: 'MO Closed on Target',
      rows: [
        ['MO Closed on Target', fmt(raw.mo_closed) + ' งาน'],
        ['MO Total',             fmt(raw.mo_total)  + ' งาน'],
      ],
      formula: (raw.mo_total || 0) > 0 && raw.mo_closed != null
        ? `MO% = ${raw.mo_closed} / ${raw.mo_total} × 100 = ${(raw.mo_closed / raw.mo_total * 100).toFixed(1)}%`
        : null,
    };
  }

  // 100P Factory
  if (no === '3.1') {
    return {
      title: '100P & Customer Returns — Factory Total',
      rows: [
        ['100P+CR Factory Amount', fmtB(raw.p100_amount_factory)],
        ['Factory Total Sales',    fmtB(raw.sales_total)],
      ],
      formula: (raw.sales_total || 0) > 0 && raw.p100_amount_factory != null
        ? `100P% = ${fmtB(raw.p100_amount_factory)} / ${fmtB(raw.sales_total)} × 100 = ${(raw.p100_amount_factory / raw.sales_total * 100).toFixed(4)}%`
        : null,
    };
  }

  // 100P Section
  if (['3.1a', '3.1b', '3.1c'].includes(no)) {
    return {
      title: '100P & Customer Returns',
      rows: [
        ['100P&CR Amount', fmtB(raw.p100_amount)],
        ['Division Sales', fmtB(raw.sales_division)],
      ],
      formula: (raw.sales_division || 0) > 0 && raw.p100_amount != null
        ? `100P% = ${fmtB(raw.p100_amount)} / ${fmtB(raw.sales_division)} × 100 = ${(raw.p100_amount / raw.sales_division * 100).toFixed(4)}%`
        : null,
    };
  }

  // Inventory
  if (['3.2', '3.3'].includes(no)) {
    const invTotal = (raw.inventory_p410 || 0) + (raw.inventory_p412 || 0);
    return {
      title: 'Inventory Balance (DSI)',
      rows: [
        ['Inventory P410 Line', fmtB(raw.inventory_p410)],
        ['Inventory P412 Line', fmtB(raw.inventory_p412)],
        ['—', '—'],
        ['Total Inventory', fmtB(invTotal)],
        ['Division Sales',  fmtB(raw.sales_division)],
      ],
      formula: (raw.sales_division || 0) > 0 && invTotal > 0
        ? `Ratio = ${fmtB(invTotal)} / ${fmtB(raw.sales_division)} = ${(invTotal / raw.sales_division).toFixed(4)}`
        : null,
    };
  }

  // Machine Break Down % (JIG)
  if (no === '3.2c') {
    const totalTime = (raw.mtbf_uptime || 0) + (raw.mttr_repair_time || 0);
    return {
      title: 'Machine Break Down %',
      rows: [
        ['Total Uptime',          fmt(raw.mtbf_uptime)      + ' min'],
        ['Total Repair (Downtime)', fmt(raw.mttr_repair_time) + ' min'],
        ['Total Time',            fmt(totalTime)             + ' min'],
      ],
      formula: totalTime > 0
        ? `BD% = ${raw.mttr_repair_time} / (${raw.mtbf_uptime} + ${raw.mttr_repair_time}) × 100 = ${((raw.mttr_repair_time || 0) / totalTime * 100).toFixed(4)}%`
        : null,
    };
  }

  // PPM
  if (['3.4', '3.5'].includes(no)) {
    return {
      title: 'Internal Defect (PPM)',
      rows: [
        ['Defect Parts',    fmt(raw.ppm_defect)     + ' pcs'],
        ['Total Production', fmt(raw.ppm_production) + ' pcs'],
      ],
      formula: (raw.ppm_production || 0) > 0 && raw.ppm_defect != null
        ? `PPM = ${raw.ppm_defect} / ${raw.ppm_production} × 1,000,000 = ${(raw.ppm_defect / raw.ppm_production * 1e6).toFixed(1)} PPM`
        : null,
    };
  }

  // Non NC Major
  if (['3.6a', '3.6b', '3.6c'].includes(no)) {
    return {
      title: 'ISO Non NC Major',
      rows: [
        ['NC Major Count', fmt(raw.iso_nc_major) + ' case'],
      ],
      formula: raw.iso_nc_major != null
        ? (raw.iso_nc_major === 0
            ? '✅ ผ่าน — ไม่มี NC Major'
            : `❌ ไม่ผ่าน — พบ ${raw.iso_nc_major} NC Major`)
        : null,
    };
  }

  // MTBF
  if (no === '3.8') {
    return {
      title: 'Mean Time Between Failures (MTBF)',
      rows: [
        ['Total Uptime',    fmt(raw.mtbf_uptime)     + ' min'],
        ['Breakdown Count', fmt(raw.breakdown_count) + ' times'],
      ],
      formula: (raw.breakdown_count || 0) > 0 && raw.mtbf_uptime != null
        ? `MTBF = ${raw.mtbf_uptime} / ${raw.breakdown_count} = ${(raw.mtbf_uptime / raw.breakdown_count).toFixed(1)} min`
        : null,
    };
  }

  // MTTR
  if (no === '3.9') {
    return {
      title: 'Mean Time To Repair (MTTR)',
      rows: [
        ['Total Repair Time', fmt(raw.mttr_repair_time) + ' min'],
        ['Breakdown Count',   fmt(raw.breakdown_count)  + ' times'],
      ],
      formula: (raw.breakdown_count || 0) > 0 && raw.mttr_repair_time != null
        ? `MTTR = ${raw.mttr_repair_time} / ${raw.breakdown_count} = ${(raw.mttr_repair_time / raw.breakdown_count).toFixed(1)} min`
        : null,
    };
  }

  // PM
  if (no === '4.0') {
    return {
      title: 'Preventive Maintenance',
      rows: [
        ['PM Completed', fmt(raw.pm_completed) + ' tasks'],
        ['PM Planned',   fmt(raw.pm_planned)   + ' tasks'],
      ],
      formula: (raw.pm_planned || 0) > 0 && raw.pm_completed != null
        ? `PM% = ${raw.pm_completed} / ${raw.pm_planned} × 100 = ${(raw.pm_completed / raw.pm_planned * 100).toFixed(1)}%`
        : null,
    };
  }

  // Safety — sub-types
  if (['4.1a', '4.1b', '4.1c'].includes(no)) {
    return {
      title: 'Safety Accidents — รายละเอียดย่อย',
      rows: [
        ['Absent Accidents > 3 Days', raw.acc_absent_3d_plus  != null ? fmt(raw.acc_absent_3d_plus)  + ' case' : '—'],
        ['Absent Accidents < 3 Days', raw.acc_absent_3d_minus != null ? fmt(raw.acc_absent_3d_minus) + ' case' : '—'],
        ['Minor Injuries',            raw.acc_minor           != null ? fmt(raw.acc_minor)            + ' case' : '—'],
        ['Fire / Injury Accidents',   raw.acc_fire            != null ? fmt(raw.acc_fire)             + ' case' : '—'],
      ],
      formula: null,
    };
  }

  // Sales / Head
  if (['4.2a', '4.2b', '4.2c'].includes(no)) {
    const sec = item.section;
    const yr  = raw.year;
    const m   = raw.month;
    const cumSales = allRaws
      .filter(r => r.section === sec && r.year === yr && r.month <= m)
      .reduce((s, r) => s + (r.sales_division || 0), 0);
    return {
      title: 'Annual Sales per Head (YTD)',
      rows: [
        [`YTD Division Sales (Jan–${m})`, fmtB(cumSales)],
        ['Headcount',                      fmt(raw.manpower_section) + ' คน'],
      ],
      formula: (raw.manpower_section || 0) > 0
        ? `Sales/Head = ${fmtB(cumSales)} / ${raw.manpower_section} / 1,000,000 = ${(cumSales / raw.manpower_section / 1e6).toFixed(3)} Mb`
        : null,
    };
  }

  // TS Academy
  if (['4.3a', '4.3b', '4.3c'].includes(no)) {
    const sec = item.section;
    const yr  = raw.year;
    const m   = raw.month;
    const cumTrained = allRaws
      .filter(r => r.section === sec && r.year === yr && r.month <= m)
      .reduce((s, r) => s + (r.course_trained_count || 0), 0);
    return {
      title: 'TS Academy Training (YTD)',
      rows: [
        [`YTD Courses Trained (Jan–${m})`, fmt(cumTrained) + ' sessions'],
        ['Annual Plan',                    fmt(raw.course_plan_annual) + ' sessions'],
      ],
      formula: (raw.course_plan_annual || 0) > 0
        ? `TS Academy = ${cumTrained} / ${raw.course_plan_annual} × 100 = ${(cumTrained / raw.course_plan_annual * 100).toFixed(1)}%`
        : null,
    };
  }

  // QCC
  if (['4.3a2', '4.3b2', '4.3c2'].includes(no)) {
    return {
      title: 'QCC (Quality Control Circle)',
      rows: [
        ['QCC Teams Qualified', fmt(raw.qcc_qualified) + ' กลุ่ม'],
        ['QCC Teams Total',     fmt(raw.qcc_total)     + ' กลุ่ม'],
      ],
      formula: (raw.qcc_total || 0) > 0 && raw.qcc_qualified != null
        ? `QCC% = ${raw.qcc_qualified} / ${raw.qcc_total} × 100 = ${(raw.qcc_qualified / raw.qcc_total * 100).toFixed(1)}%`
        : null,
    };
  }

  // Engineering Day
  if (['4.4a', '4.4b', '4.4c'].includes(no)) {
    return {
      title: 'Engineering Day',
      rows: [
        ['Teams (Target ≥ 1)',          fmt(raw.eng_day_teams) + ' ทีม'],
        ['Activity Types (Target ≥ 3)', fmt(raw.eng_day_types) + ' ประเภท'],
      ],
      formula: raw.eng_day_teams != null
        ? (raw.eng_day_teams >= 1 && (raw.eng_day_types ?? 0) >= 3
            ? '✅ ผ่านทั้ง 2 เงื่อนไข'
            : `⚠️ Teams: ${raw.eng_day_teams ?? 0}/1, Types: ${raw.eng_day_types ?? 0}/3`)
        : null,
    };
  }

  return null;
}
