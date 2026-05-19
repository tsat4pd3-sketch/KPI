import {
  ComposedChart, Bar, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { MONTHS_TH, achievementColor } from '../config';

export default function MonthlyChart({ data, color = '#4d9fff', unit = '', lowerBetter = false }) {
  const chartData = data.map((d, i) => ({
    month: MONTHS_TH[i],
    actual: d.actual,
    target: d.target,
  }));

  function getBarColor(actual, target) {
    if (actual == null) return 'var(--border2)';
    if (target == null) return color;
    const pct = lowerBetter
      ? (target > 0 ? Math.min((target / actual) * 100, 150) : actual === 0 ? 100 : 0)
      : (target > 0 ? Math.min((actual / target) * 100, 150) : 0);
    return achievementColor(pct);
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="month" tick={{ fill: 'var(--text2)', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{
            background: 'var(--bg3)', border: '1px solid var(--border2)',
            borderRadius: 8, fontSize: 12,
          }}
          formatter={(v, name) => [
            v != null ? `${Number(v).toLocaleString()} ${unit}` : '-',
            name === 'actual' ? 'Actual' : 'Target',
          ]}
        />
        <Bar dataKey="actual" radius={[4, 4, 0, 0]} maxBarSize={36}>
          {chartData.map((d, i) => (
            <Cell key={i} fill={getBarColor(d.actual, d.target)} fillOpacity={d.actual != null ? 0.85 : 0.15} />
          ))}
        </Bar>
        <Line
          dataKey="target" stroke="var(--accent)" strokeDasharray="5 3"
          dot={false} strokeWidth={1.5} connectNulls={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
