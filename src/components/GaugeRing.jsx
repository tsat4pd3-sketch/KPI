import { achievementColor } from '../config';

export default function GaugeRing({ pct, size = 110 }) {
  const r = (size - 16) / 2;
  const circ = 2 * Math.PI * r;
  const clamped = pct != null ? Math.min(Math.max(pct, 0), 100) : 0;
  const dash = (clamped / 100) * circ;
  const color = achievementColor(pct);
  const hasData = pct != null;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border2)" strokeWidth={7} />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={hasData ? color : 'var(--border2)'} strokeWidth={7}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
      <text
        x={size / 2} y={size / 2 - 2}
        textAnchor="middle" dominantBaseline="central"
        fill={hasData ? 'var(--text)' : 'var(--muted)'}
        fontSize={size * 0.19} fontWeight="700" fontFamily="var(--font-display)"
      >
        {hasData ? Math.round(clamped) : '—'}
      </text>
      {hasData && (
        <text
          x={size / 2} y={size / 2 + size * 0.17}
          textAnchor="middle"
          fill="var(--muted)" fontSize={size * 0.11} fontFamily="var(--font-display)"
        >
          %
        </text>
      )}
    </svg>
  );
}
