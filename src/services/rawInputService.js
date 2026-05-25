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

  // 1. Upsert raw input
  const { error } = await supabase
    .from('kpi_raw_inputs')
    .upsert({ ...rawRecord, updated_at: new Date().toISOString() },
      { onConflict: 'year,month,section' });
  if (error) throw error;

  // 2. Build updated raws for cumulative calc
  const updatedRaws = [
    ...yearRaws.filter(r => !(r.section === section && r.month === month)),
    rawRecord,
  ];

  // 3. Compute & save current section's actuals
  const computed = computeActuals(rawRecord, items, updatedRaws, month);
  await Promise.all(
    Object.entries(computed).map(([kpi_item_id, val]) =>
      upsertActual({ kpi_item_id, year, month, actual_value: +val.toFixed(6), note: '' })
    )
  );

  // 4. When ALL section changes (sales_total updated), recompute DL%/OH% for section records
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

// Returns { [kpi_item_id]: computedValue }
export function computeActuals(raw, items, allRaws, month) {
  if (!raw) return {};
  const res = {};
  const findId = (no) => items.find(i => i.kpi_no === no)?.id;
  const sec = raw.section;
  const yr = raw.year;

  if (sec !== 'ALL') {
    const dlTotal = (raw.dl_salary || 0) + (raw.dl_ot || 0) + (raw.dl_bonus || 0);
    const ohTotal = (raw.oh_usage || 0) + (raw.oh_spare_part || 0) + (raw.oh_repair || 0) + (raw.oh_other || 0);

    // sales_total is entered once in the factory-wide (ALL) record; fallback to raw for backwards compat
    const factoryRaw = allRaws?.find(r => r.section === 'ALL' && r.year === yr && r.month === month);
    const salesTotal = factoryRaw?.sales_total || raw.sales_total || 0;

    if (salesTotal > 0) {
      const dlNo = sec === 'PD3' ? '1.1' : sec === 'PD4' ? '1.3' : '1.5';
      const ohNo = sec === 'PD3' ? '1.2' : sec === 'PD4' ? '1.4' : '1.6';
      if (findId(dlNo)) res[findId(dlNo)] = dlTotal / salesTotal * 100;
      if (findId(ohNo)) res[findId(ohNo)] = ohTotal / salesTotal * 100;
    }

    if ((raw.sales_division || 0) > 0) {
      const p100No = sec === 'PD3' ? '3.1a' : sec === 'PD4' ? '3.1b' : '3.1c';
      if (findId(p100No) && raw.p100_amount != null)
        res[findId(p100No)] = raw.p100_amount / raw.sales_division * 100;

      if (sec !== 'JIG') {
        const invNo = sec === 'PD3' ? '3.2' : '3.3';
        const invTotal = (raw.inventory_p410 || 0) + (raw.inventory_p412 || 0);
        if (findId(invNo) && invTotal > 0)
          res[findId(invNo)] = invTotal / raw.sales_division;
      }
    }

    // PPM — PD3 (3.4) and PD4 (3.5)
    if (['PD3', 'PD4'].includes(sec)) {
      const ppmNo = sec === 'PD3' ? '3.4' : '3.5';
      const ppmId = findId(ppmNo);
      if (ppmId && (raw.ppm_production || 0) > 0 && raw.ppm_defect != null)
        res[ppmId] = raw.ppm_defect / raw.ppm_production * 1e6;
    }

    // MTBF, MTTR, PM — JIG only
    if (sec === 'JIG') {
      const btId = findId('3.8');
      if (btId && (raw.breakdown_count || 0) > 0 && raw.mtbf_uptime != null)
        res[btId] = raw.mtbf_uptime / raw.breakdown_count;

      const trId = findId('3.9');
      if (trId && (raw.breakdown_count || 0) > 0 && raw.mttr_repair_time != null)
        res[trId] = raw.mttr_repair_time / raw.breakdown_count;

      const pmId = findId('4.0');
      if (pmId && (raw.pm_planned || 0) > 0 && raw.pm_completed != null)
        res[pmId] = raw.pm_completed / raw.pm_planned * 100;
    }

    // Sales/Head — cumulative YTD
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
    // ALL section: Customer Satisfaction
    const csId = findId('2.1');
    if (csId && raw.cust_sat_q != null && raw.cust_sat_d != null)
      res[csId] = (raw.cust_sat_q + raw.cust_sat_d) / 2;

    // ALL section: Factory-wide 100P
    const p100FacId = findId('3.1');
    if (p100FacId && raw.p100_amount_factory != null && (raw.sales_total || 0) > 0)
      res[p100FacId] = raw.p100_amount_factory / raw.sales_total * 100;
  }

  return res;
}

// Build drill-down breakdown lines for a given item + raw record
export function buildDrillDown(item, raw, allRaws) {
  if (!raw || !item) return null;
  const no = item.kpi_no;
  const fmt = (v) => v == null ? '—' : Number(v).toLocaleString('th-TH', { maximumFractionDigits: 2 });
  const fmtB = (v) => v == null ? '—' : '฿' + Number(v).toLocaleString('th-TH', { maximumFractionDigits: 2 });

  if (['1.1', '1.3', '1.5'].includes(no)) {
    const dl = (raw.dl_salary || 0) + (raw.dl_ot || 0) + (raw.dl_bonus || 0);
    const factoryRaw = allRaws?.find(r => r.section === 'ALL' && r.year === raw.year && r.month === raw.month);
    const factorySales = factoryRaw?.sales_total ?? raw.sales_total ?? 0;
    return {
      title: 'Direct Labour Cost',
      rows: [
        ['DL Salary', fmtB(raw.dl_salary)],
        ['DL Overtime', fmtB(raw.dl_ot)],
        ['DL Bonus', fmtB(raw.dl_bonus)],
        ['—', '—'],
        ['Total DL', fmtB(dl)],
        ['Factory Sales (รวมโรงงาน)', fmtB(factorySales)],
      ],
      formula: factorySales > 0 ? `DL% = ${fmtB(dl)} / ${fmtB(factorySales)} × 100 = ${(dl / factorySales * 100).toFixed(4)}%` : null,
    };
  }
  if (['1.2', '1.4', '1.6'].includes(no)) {
    const oh = (raw.oh_usage || 0) + (raw.oh_spare_part || 0) + (raw.oh_repair || 0) + (raw.oh_other || 0);
    const factoryRaw = allRaws?.find(r => r.section === 'ALL' && r.year === raw.year && r.month === raw.month);
    const factorySales = factoryRaw?.sales_total ?? raw.sales_total ?? 0;
    return {
      title: 'Overhead Cost',
      rows: [
        ['OH Usage', fmtB(raw.oh_usage)],
        ['OH Spare Part', fmtB(raw.oh_spare_part)],
        ['OH Repair', fmtB(raw.oh_repair)],
        ['OH Other', fmtB(raw.oh_other)],
        ['—', '—'],
        ['Total OH', fmtB(oh)],
        ['Factory Sales (รวมโรงงาน)', fmtB(factorySales)],
      ],
      formula: factorySales > 0 ? `OH% = ${fmtB(oh)} / ${fmtB(factorySales)} × 100 = ${(oh / factorySales * 100).toFixed(4)}%` : null,
    };
  }
  if (no === '2.1') {
    return {
      title: 'Customer Satisfaction',
      rows: [
        ['Quality Score', fmt(raw.cust_sat_q) + '%'],
        ['Delivery Score', fmt(raw.cust_sat_d) + '%'],
      ],
      formula: raw.cust_sat_q != null && raw.cust_sat_d != null
        ? `Average = (${raw.cust_sat_q} + ${raw.cust_sat_d}) / 2 = ${((raw.cust_sat_q + raw.cust_sat_d) / 2).toFixed(2)}%`
        : null,
    };
  }
  if (no === '3.1') {
    return {
      title: '100P & Customer Returns — Factory Total',
      rows: [
        ['100P+CR Factory Amount', fmtB(raw.p100_amount_factory)],
        ['Factory Total Sales', fmtB(raw.sales_total)],
      ],
      formula: (raw.sales_total || 0) > 0 && raw.p100_amount_factory != null
        ? `100P% = ${fmtB(raw.p100_amount_factory)} / ${fmtB(raw.sales_total)} × 100 = ${(raw.p100_amount_factory / raw.sales_total * 100).toFixed(4)}%`
        : null,
    };
  }
  if (['3.1a', '3.1b', '3.1c'].includes(no)) {
    return {
      title: '100P & Customer Returns',
      rows: [
        ['100P&CR Amount', fmtB(raw.p100_amount)],
        ['Division Sales', fmtB(raw.sales_division)],
      ],
      formula: raw.sales_division > 0 && raw.p100_amount != null
        ? `100P% = ${fmtB(raw.p100_amount)} / ${fmtB(raw.sales_division)} × 100 = ${(raw.p100_amount / raw.sales_division * 100).toFixed(4)}%`
        : null,
    };
  }
  if (['3.2', '3.3'].includes(no)) {
    const invTotal = (raw.inventory_p410 || 0) + (raw.inventory_p412 || 0);
    return {
      title: 'Inventory Balance',
      rows: [
        ['Inventory P410 Line', fmtB(raw.inventory_p410)],
        ['Inventory P412 Line', fmtB(raw.inventory_p412)],
        ['—', '—'],
        ['Total Inventory', fmtB(invTotal)],
        ['Division Sales', fmtB(raw.sales_division)],
      ],
      formula: raw.sales_division > 0 && invTotal > 0
        ? `Ratio = ${fmtB(invTotal)} / ${fmtB(raw.sales_division)} = ${(invTotal / raw.sales_division).toFixed(4)}`
        : null,
    };
  }
  if (['3.4', '3.5'].includes(no)) {
    return {
      title: 'Internal Defect (PPM)',
      rows: [
        ['Defect Parts', fmt(raw.ppm_defect) + ' pcs'],
        ['Total Production', fmt(raw.ppm_production) + ' pcs'],
      ],
      formula: (raw.ppm_production || 0) > 0 && raw.ppm_defect != null
        ? `PPM = ${raw.ppm_defect} / ${raw.ppm_production} × 1,000,000 = ${(raw.ppm_defect / raw.ppm_production * 1e6).toFixed(1)} PPM`
        : null,
    };
  }
  if (no === '3.8') {
    return {
      title: 'Mean Time Between Failures (MTBF)',
      rows: [
        ['Total Uptime', fmt(raw.mtbf_uptime) + ' min'],
        ['Breakdown Count', fmt(raw.breakdown_count) + ' times'],
      ],
      formula: (raw.breakdown_count || 0) > 0 && raw.mtbf_uptime != null
        ? `MTBF = ${raw.mtbf_uptime} / ${raw.breakdown_count} = ${(raw.mtbf_uptime / raw.breakdown_count).toFixed(1)} min`
        : null,
    };
  }
  if (no === '3.9') {
    return {
      title: 'Mean Time To Repair (MTTR)',
      rows: [
        ['Total Repair Time', fmt(raw.mttr_repair_time) + ' min'],
        ['Breakdown Count', fmt(raw.breakdown_count) + ' times'],
      ],
      formula: (raw.breakdown_count || 0) > 0 && raw.mttr_repair_time != null
        ? `MTTR = ${raw.mttr_repair_time} / ${raw.breakdown_count} = ${(raw.mttr_repair_time / raw.breakdown_count).toFixed(1)} min`
        : null,
    };
  }
  if (no === '4.0') {
    return {
      title: 'Preventive Maintenance',
      rows: [
        ['PM Completed', fmt(raw.pm_completed) + ' tasks'],
        ['PM Planned', fmt(raw.pm_planned) + ' tasks'],
      ],
      formula: (raw.pm_planned || 0) > 0 && raw.pm_completed != null
        ? `PM% = ${raw.pm_completed} / ${raw.pm_planned} × 100 = ${(raw.pm_completed / raw.pm_planned * 100).toFixed(1)}%`
        : null,
    };
  }
  if (['4.2a', '4.2b', '4.2c'].includes(no)) {
    const sec = item.section;
    const yr = raw.year;
    const m = raw.month;
    const cumSales = allRaws
      .filter(r => r.section === sec && r.year === yr && r.month <= m)
      .reduce((s, r) => s + (r.sales_division || 0), 0);
    return {
      title: 'Annual Sales per Head (YTD)',
      rows: [
        ['YTD Division Sales (Jan–' + m + ')', fmtB(cumSales)],
        ['Headcount', fmt(raw.manpower_section) + ' คน'],
      ],
      formula: raw.manpower_section > 0
        ? `Sales/Head = ${fmtB(cumSales)} / ${raw.manpower_section} / 1,000,000 = ${(cumSales / raw.manpower_section / 1e6).toFixed(3)} Mb`
        : null,
    };
  }
  if (['4.3a', '4.3b', '4.3c'].includes(no)) {
    const sec = item.section;
    const yr = raw.year;
    const m = raw.month;
    const cumTrained = allRaws
      .filter(r => r.section === sec && r.year === yr && r.month <= m)
      .reduce((s, r) => s + (r.course_trained_count || 0), 0);
    return {
      title: 'TS Academy Training (YTD)',
      rows: [
        ['YTD Courses Trained (Jan–' + m + ')', fmt(cumTrained) + ' sessions'],
        ['Annual Plan', fmt(raw.course_plan_annual) + ' sessions'],
      ],
      formula: raw.course_plan_annual > 0
        ? `TS Academy = ${cumTrained} / ${raw.course_plan_annual} × 100 = ${(cumTrained / raw.course_plan_annual * 100).toFixed(1)}%`
        : null,
    };
  }
  return null;
}
