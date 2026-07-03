import { useState } from 'react';
import { linearScale, niceMax, useMeasure } from './scale';

export interface BarChartProps {
  data: { ts: number; values: number[] }[];
  colors: string[];
  labels: string[];
  height?: number;
  formatLabel?: (ts: number) => string;
}

const PAD = { top: 10, right: 12, bottom: 22, left: 44 };

function fmtTick(v: number): string {
  if (v >= 1_000_000) return `${+(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1000) return `${+(v / 1000).toFixed(1)}k`;
  if (Number.isInteger(v)) return String(v);
  return v.toFixed(v < 1 ? 2 : 1);
}

function fmtVal(v: number): string {
  if (Number.isInteger(v)) return v.toLocaleString();
  return v.toFixed(2);
}

export function BarChart({ data, colors, labels, height = 220, formatLabel }: BarChartProps) {
  const [ref, width] = useMeasure();
  const [hover, setHover] = useState<number | null>(null);

  const fmt =
    formatLabel ??
    ((ts: number) => new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));

  const sums = data.map((d) => d.values.reduce((a, b) => a + b, 0));
  const maxSum = sums.length ? Math.max(...sums) : 0;

  if (width === 0) {
    return <div ref={ref} className="relative w-full overflow-hidden" style={{ height }} />;
  }

  if (data.length === 0 || maxSum <= 0) {
    return (
      <div ref={ref} className="relative flex w-full items-center justify-center overflow-hidden" style={{ height }}>
        <span className="text-xs text-slate-500">No data yet</span>
      </div>
    );
  }

  const innerW = width - PAD.left - PAD.right;
  const innerH = height - PAD.top - PAD.bottom;
  // Bars are call counts (integers). Use an integer tick step so the y-axis
  // never shows fractional counts like "0.75" on low-traffic windows.
  const rawMax = niceMax(maxSum * 1.05) || 1;
  const tickStep = Math.max(1, Math.ceil(rawMax / 4));
  const yMax = tickStep * 4;
  const y = linearScale(0, yMax, height - PAD.bottom, PAD.top);
  const yTicks = [0, 1, 2, 3, 4].map((k) => k * tickStep);

  const step = innerW / Math.max(1, data.length);
  const barW = step * 0.62;
  const labelEvery = Math.max(1, Math.ceil(data.length / 5));

  const ttW = 150;
  const ttLeft =
    hover !== null
      ? Math.min(Math.max(PAD.left + hover * step + step / 2 - ttW / 2, 4), Math.max(4, width - ttW - 4))
      : 0;
  const hoverVals = hover !== null ? data[hover].values : [];
  const hoverAllZero = hoverVals.every((v) => v === 0);

  return (
    <div ref={ref} className="relative w-full overflow-hidden" style={{ height }} onMouseLeave={() => setHover(null)}>
      <svg width={width} height={height} className="block">
        {yTicks.map((t) => (
          <g key={t}>
            <line
              x1={PAD.left}
              x2={width - PAD.right}
              y1={y(t)}
              y2={y(t)}
              stroke="rgba(148,163,184,0.08)"
            />
            <text
              x={PAD.left - 8}
              y={y(t)}
              dy="0.32em"
              textAnchor="end"
              fontSize={10}
              fill="#64748b"
              className="font-mono"
            >
              {fmtTick(t)}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          if (i % labelEvery !== 0) return null;
          return (
            <text
              key={`xl-${d.ts}-${i}`}
              x={PAD.left + i * step + step / 2}
              y={height - 6}
              textAnchor="middle"
              fontSize={10}
              fill="#64748b"
            >
              {fmt(d.ts)}
            </text>
          );
        })}
        {data.map((d, i) => {
          const x = PAD.left + i * step + (step - barW) / 2;
          const topIdx = d.values.reduce((acc, v, si) => (v > 0 ? si : acc), -1);
          let cum = 0;
          const segs = d.values.map((v, si) => {
            const y0 = y(cum);
            const y1 = y(cum + v);
            cum += v;
            if (v <= 0 || y0 - y1 <= 0) return null;
            return (
              <rect
                key={si}
                x={x}
                y={y1}
                width={barW}
                height={y0 - y1}
                fill={colors[si]}
                rx={si === topIdx ? 2 : 0}
              />
            );
          });
          return (
            <g key={`bar-${d.ts}-${i}`} opacity={hover === null || hover === i ? 1 : 0.55}>
              {segs}
            </g>
          );
        })}
        {data.map((d, i) => (
          <rect
            key={`hov-${d.ts}-${i}`}
            x={PAD.left + i * step}
            y={PAD.top}
            width={step}
            height={innerH}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
          />
        ))}
      </svg>
      {hover !== null && (
        <div
          className="pointer-events-none absolute z-10 rounded-lg border border-white/10 bg-[#0b0b14] px-2.5 py-1.5 text-xs shadow-xl"
          style={{ left: ttLeft, top: PAD.top + 4, minWidth: 130 }}
        >
          <div className="mb-1 text-slate-400">{fmt(data[hover].ts)}</div>
          {hoverVals.map((v, si) => {
            if (v === 0 && !hoverAllZero) return null;
            return (
              <div key={si} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span
                    className="inline-block h-2 w-2 rounded-sm"
                    style={{ backgroundColor: colors[si] }}
                  />
                  {labels[si]}
                </span>
                <span className="font-mono text-white">{fmtVal(v)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
