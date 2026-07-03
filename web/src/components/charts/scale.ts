import { useEffect, useRef, useState, type RefObject } from 'react';

export const linearScale =
  (d0: number, d1: number, r0: number, r1: number) =>
  (v: number) =>
    r0 + ((v - d0) / (d1 - d0 || 1)) * (r1 - r0);

const NICE_STEPS = [1, 2, 2.5, 5, 10];

export function niceMax(v: number): number {
  if (v <= 0) return 1;
  let k = Math.floor(Math.log10(v));
  for (;;) {
    const pow = Math.pow(10, k);
    for (const step of NICE_STEPS) {
      const candidate = step * pow;
      if (candidate >= v) return candidate;
    }
    k += 1;
  }
}

export function ticks(max: number, count = 4): number[] {
  const step = max / count;
  return Array.from({ length: count + 1 }, (_, i) => i * step);
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export function linePath(pts: [number, number][]): string {
  if (pts.length === 0) return '';
  return pts
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${r2(x)} ${r2(y)}`)
    .join(' ');
}

export function smoothPath(pts: [number, number][]): string {
  if (pts.length < 3) return linePath(pts);
  const first = pts[0];
  let d = `M ${r2(first[0])} ${r2(first[1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(i - 1, 0)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(i + 2, pts.length - 1)];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${r2(c1x)} ${r2(c1y)}, ${r2(c2x)} ${r2(c2y)}, ${r2(p2[0])} ${r2(p2[1])}`;
  }
  return d;
}

export function useMeasure(): [RefObject<HTMLDivElement>, number] {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      setWidth(el.clientWidth);
    });
    observer.observe(el);
    setWidth(el.clientWidth);
    return () => observer.disconnect();
  }, []);

  return [ref, width];
}
