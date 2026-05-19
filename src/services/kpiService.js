import { supabase } from '../supabaseClient';

export async function getKPIItems() {
  const { data, error } = await supabase
    .from('kpi_items')
    .select('*')
    .eq('is_active', true)
    .order('order_index');
  if (error) throw error;
  return data;
}

export async function getTargets(year) {
  const { data, error } = await supabase
    .from('kpi_targets')
    .select('*')
    .eq('year', year);
  if (error) throw error;
  return data ?? [];
}

export async function getActuals(year) {
  const { data, error } = await supabase
    .from('kpi_actuals')
    .select('*')
    .eq('year', year);
  if (error) throw error;
  return data ?? [];
}

export async function upsertActual({ kpi_item_id, year, month, actual_value, note }) {
  const { error } = await supabase
    .from('kpi_actuals')
    .upsert(
      { kpi_item_id, year, month, actual_value, note, updated_at: new Date().toISOString() },
      { onConflict: 'kpi_item_id,year,month' }
    );
  if (error) throw error;
}

export async function upsertTarget({ kpi_item_id, year, month, target_value }) {
  const { error } = await supabase
    .from('kpi_targets')
    .upsert(
      { kpi_item_id, year, month, target_value, updated_at: new Date().toISOString() },
      { onConflict: 'kpi_item_id,year,month' }
    );
  if (error) throw error;
}

export function buildMaps(items, targets, actuals, oeeByYear) {
  const targetMap = {};
  targets.forEach(t => {
    if (!targetMap[t.kpi_item_id]) targetMap[t.kpi_item_id] = {};
    const key = t.month ?? 'annual';
    targetMap[t.kpi_item_id][key] = t.target_value;
  });

  const actualMap = {};
  actuals.forEach(a => {
    if (!actualMap[a.kpi_item_id]) actualMap[a.kpi_item_id] = {};
    actualMap[a.kpi_item_id][a.month] = a.actual_value;
  });

  if (oeeByYear) {
    const oeeItem    = items.find(i => i.name_en === 'OEE');
    const defectItem = items.find(i => i.name_en === 'Defect PPM');
    oeeByYear.forEach(({ month, oee, defect }) => {
      if (oeeItem && oee != null) {
        if (!actualMap[oeeItem.id]) actualMap[oeeItem.id] = {};
        actualMap[oeeItem.id][month] = oee;
      }
      if (defectItem && defect != null) {
        if (!actualMap[defectItem.id]) actualMap[defectItem.id] = {};
        actualMap[defectItem.id][month] = defect;
      }
    });
  }

  return { targetMap, actualMap };
}

export function getItemYTD(item, targetMap, actualMap) {
  const tm = targetMap[item.id] ?? {};
  const am = actualMap[item.id] ?? {};
  const months = Object.keys(am).map(Number).filter(m => m >= 1 && m <= 12);
  if (months.length === 0) return { actual: null, target: tm.annual ?? null };
  const avgActual = months.reduce((s, m) => s + am[m], 0) / months.length;
  const target = tm.annual ?? (() => {
    const vals = months.map(m => tm[m]).filter(v => v != null);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  })();
  return { actual: +avgActual.toFixed(2), target };
}

export function getItemMonthly(item, targetMap, actualMap) {
  const tm = targetMap[item.id] ?? {};
  const am = actualMap[item.id] ?? {};
  return Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    return {
      month: m,
      actual: am[m] ?? null,
      target: tm[m] ?? tm.annual ?? null,
    };
  });
}
