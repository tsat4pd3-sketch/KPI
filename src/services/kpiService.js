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
    .from('kpi_targets').select('*').eq('year', year);
  if (error) throw error;
  return data ?? [];
}

export async function getActuals(year) {
  const { data, error } = await supabase
    .from('kpi_actuals').select('*').eq('year', year);
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
    targetMap[t.kpi_item_id][t.month ?? 'annual'] = t.target_value;
  });

  const actualMap = {};
  actuals.forEach(a => {
    if (!actualMap[a.kpi_item_id]) actualMap[a.kpi_item_id] = {};
    actualMap[a.kpi_item_id][a.month] = a.actual_value;
  });

  if (oeeByYear) {
    const find = no => items.find(i => i.kpi_no === no);
    const oeePD3    = find('3.6');
    const oeePD4    = find('3.7');
    const defectPD3 = find('3.4');
    const defectPD4 = find('3.5');

    oeeByYear.forEach(({ month, oee_pd3, defect_pd3, oee_pd4, defect_pd4 }) => {
      const set = (item, val) => {
        if (!item || val == null) return;
        if (!actualMap[item.id]) actualMap[item.id] = {};
        actualMap[item.id][month] = val;
      };
      set(oeePD3, oee_pd3);
      set(oeePD4, oee_pd4);
      set(defectPD3, defect_pd3);
      set(defectPD4, defect_pd4);
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
  return { actual: +avgActual.toFixed(4), target };
}

export function getItemMonthly(item, targetMap, actualMap) {
  const tm = targetMap[item.id] ?? {};
  const am = actualMap[item.id] ?? {};
  return Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    return { month: m, actual: am[m] ?? null, target: tm[m] ?? tm.annual ?? null };
  });
}
