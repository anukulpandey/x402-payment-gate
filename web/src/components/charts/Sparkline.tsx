import { useId } from 'react';
import { linePath } from './scale';

const PAD = 2;

export function Sparkline({
  values,
  width = 110,
  height = 34,
  color = 'var(--color-accent-400)',
}: {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
}) {
  const gradientId = useId();

  if (values.length < 2 || values.every((v) => v === 0)) {
    return (
      <svg width={width} height={height} aria-hidden="true">
        <line
          x1={PAD}
          y1={height - PAD}
          x2={width - PAD}
          y2={height - PAD}
          stroke="rgba(148,163,184,0.25)"
          strokeWidth={1}
        />
      </svg>
    );
  }

  const max = Math.max(...values) || 1;
  const innerW = width - PAD * 2;
  const innerH = height - PAD * 2;
  const pts: [number, number][] = values.map((v, i) => [
    PAD + (i / (values.length - 1)) * innerW,
    PAD + innerH - (v / max) * innerH,
  ]);
  const line = linePath(pts);
  const first = pts[0];
  const last = pts[pts.length - 1];
  const area = `${line} L ${last[0]} ${height - PAD} L ${first[0]} ${height - PAD} Z`;

  return (
    <svg width={width} height={height} aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.25} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} stroke="none" />
      <path d={line} fill="none" stroke={color} strokeWidth={1.5} />
      <circle cx={last[0]} cy={last[1]} r={2} fill={color} />
    </svg>
  );
}
