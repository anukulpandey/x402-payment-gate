import { useId, useState } from 'react';
import type { MouseEvent as ReactMouseEvent, ReactNode } from 'react';
import { linearScale, linePath, niceMax, smoothPath, ticks, useMeasure } from './scale';

export interface AreaChartProps {
  data: { ts: number; value: number }[];
  height?: number;
  color?: string;
  smooth?: boolean;
  formatValue?: (v: number) => string;
  formatLabel?: (ts: number) => string;
  renderTooltip?: (d: { ts: number; value: number }, i: number) => ReactNode;
}

const PAD = { top: 10, right: 12, bottom: 22, left: 44 };
const TOOLTIP_W = 150;
const TOOLTIP_EST_H = 56;

export function AreaChart({
  data,
  height = 220,
  color = 'var(--color-accent-400)',
  smooth = true,
  formatValue = (v: number) => String(v),
  formatLabel = (ts: number) => new Date(ts).toLocaleString(),
  renderTooltip,
}: AreaChartProps) {
  const [measureRef, width] = useMeasure();
  const [hover, setHover] = useState<number | null>(null);
  const rawId = useId();
  const gradId = `area-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`;

  if (width <= 0) {
    return <div ref={measureRef} className="relative w-full overflow-hidden" style={{ height }} />;
  }

  const innerW = Math.max(0, width - PAD.left - PAD.right);
  const innerH = Math.max(0, height - PAD.top - PAD.bottom);
  const baseY = height - PAD.bottom;

  const maxValue = data.reduce((m, d) => Math.max(m, d.value), 0);
  const hasData = data.length > 0 && maxValue > 0;

  let yMax = niceMax(maxValue * 1.05);
  if (!(yMax > 0)) yMax = 1;

  const y = linearScale(0, yMax, baseY, PAD.top);
  const x =
    data.length > 1
      ? linearScale(data[0].ts, data[data.length - 1].ts, PAD.left, width - PAD.right)
      : (_v: number) => PAD.left + innerW / 2;

  const yTicks = ticks(yMax, 4);

  const labelIdxs: number[] = [];
  if (data.length > 0) {
    const n = data.length;
    const want = Math.min(5, n);
    const seen = new Set<number>();
    for (let k = 0; k < want; k++) {
      seen.add(Math.round((k * (n - 1)) / Math.max(1, want - 1)));
    }
    labelIdxs.push(...Array.from(seen).sort((a, b) => a - b));
  }

  const pts: [number, number][] = hasData ? data.map((d) => [x(d.ts), y(d.value)]) : [];
  const line = hasData ? (smooth ? smoothPath : linePath)(pts) : '';
  const area = hasData
    ? `${line} L ${pts[pts.length - 1][0]},${baseY} L ${pts[0][0]},${baseY} Z`
    : '';

  const onMove = (e: ReactMouseEvent<SVGRectElement>) => {
    const rect = measureRef.current?.getBoundingClientRect();
    if (!rect || data.length === 0) return;
    const mx = e.clientX - rect.left;
    const step = innerW / Math.max(1, data.length - 1);
    const i = Math.min(data.length - 1, Math.max(0, Math.round((mx - PAD.left) / step)));
    setHover(i);
  };

  const hovered = hasData && hover !== null && hover < data.length ? data[hover] : null;
  const hx = hovered ? x(hovered.ts) : 0;
  const hy = hovered ? y(hovered.value) : 0;
  const tipLeft = Math.min(Math.max(hx + 10, 0), Math.max(0, width - TOOLTIP_W));
  const tipTop = Math.max(0, hy - 8 - TOOLTIP_EST_H);

  return (
    <div ref={measureRef} className="relative w-full overflow-hidden">
      <svg width={width} height={height} className="block">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity={0.35} />
            <stop offset="1" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        {yTicks.map((t) => (
          <g key={t}>
            <line
              x1={PAD.left}
              x2={width - PAD.right}
              y1={y(t)}
              y2={y(t)}
              stroke="rgba(255,255,255,0.06)"
            />
            <text x={PAD.left - 8} y={y(t) + 3} textAnchor="end" fontSize={10} fill="#64748b">
              {formatValue(t)}
            </text>
          </g>
        ))}
        <line
          x1={PAD.left}
          x2={width - PAD.right}
          y1={baseY}
          y2={baseY}
          stroke="rgba(255,255,255,0.08)"
        />
        {labelIdxs.map((i) => (
          <text
            key={i}
            x={x(data[i].ts)}
            y={height - 6}
            textAnchor="middle"
            fontSize={10}
            fill="#64748b"
          >
            {formatLabel(data[i].ts)}
          </text>
        ))}
        {hasData && (
          <>
            <path d={area} fill={`url(#${gradId})`} />
            <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
            {hovered && (
              <>
                <line
                  x1={hx}
                  x2={hx}
                  y1={PAD.top}
                  y2={baseY}
                  stroke="rgba(255,255,255,0.12)"
                />
                <circle cx={hx} cy={hy} r={4} fill={color} stroke="#fff" strokeWidth={1.5} />
              </>
            )}
            <rect
              x={PAD.left}
              y={PAD.top}
              width={innerW}
              height={innerH}
              fill="transparent"
              onMouseMove={onMove}
              onMouseLeave={() => setHover(null)}
            />
          </>
        )}
      </svg>
      {hovered && (
        <div
          className="pointer-events-none absolute z-10 rounded-lg border border-white/10 bg-[#0b0b14] px-2.5 py-1.5 text-xs shadow-xl"
          style={{ left: tipLeft, top: tipTop }}
        >
          {renderTooltip ? (
            renderTooltip(hovered, hover as number)
          ) : (
            <>
              <div className="text-slate-400">{formatLabel(hovered.ts)}</div>
              <div className="font-mono text-white">{formatValue(hovered.value)}</div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
