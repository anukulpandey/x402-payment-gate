import { useState } from 'react';
import { cx } from '../ui';

export interface DonutProps {
  slices: { label: string; value: number; color: string }[];
  size?: number;
  thickness?: number;
  centerLabel?: { value: string; sub: string };
}

function fmtVal(v: number): string {
  if (Number.isInteger(v)) return v.toLocaleString();
  return v.toFixed(2);
}

export function Donut({ slices, size = 160, thickness = 18, centerLabel }: DonutProps) {
  const [hover, setHover] = useState<number | null>(null);

  const r = (size - thickness) / 2;
  const C = 2 * Math.PI * r;
  const total = slices.reduce((a, s) => a + s.value, 0);

  let cum = 0;
  const arcs = slices.map((s) => {
    const frac = total > 0 ? s.value / total : 0;
    const arc = { frac, offset: cum, color: s.color };
    cum += frac;
    return arc;
  });

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="block">
          <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
            {total <= 0 ? (
              <circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke="rgba(148,163,184,0.2)"
                strokeWidth={thickness}
              />
            ) : (
              arcs.map((a, i) => {
                if (a.frac <= 0) return null;
                return (
                  <circle
                    key={i}
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    fill="none"
                    stroke={a.color}
                    strokeWidth={hover === i ? thickness + 3 : thickness}
                    strokeDasharray={`${a.frac * C} ${C}`}
                    strokeDashoffset={-a.offset * C}
                    strokeLinecap="butt"
                    style={{ transition: 'stroke-width 120ms ease' }}
                    onMouseEnter={() => setHover(i)}
                    onMouseLeave={() => setHover(null)}
                  />
                );
              })
            )}
          </g>
        </svg>
        {centerLabel && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-mono text-xl text-white">{centerLabel.value}</span>
            <span className="text-[10px] text-slate-500">{centerLabel.sub}</span>
          </div>
        )}
      </div>
      <div className="w-full space-y-1.5 text-xs">
        {slices.map((s, i) => {
          const p = total > 0 ? (s.value / total) * 100 : 0;
          const hovered = hover === i;
          return (
            <div
              key={i}
              className="flex items-center gap-2"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            >
              <span
                className="inline-block h-2 w-2 shrink-0 rounded-sm"
                style={{ backgroundColor: s.color }}
              />
              <span className={cx(hovered ? 'text-white' : 'text-slate-300')}>{s.label}</span>
              <span className={cx('ml-auto font-mono', hovered ? 'text-white' : 'text-slate-400')}>
                {fmtVal(s.value)} &middot; {p >= 10 || p === 0 ? p.toFixed(0) : p.toFixed(1)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
