import { useEffect, useRef, useState } from 'react';

export function CountUp({
  to,
  decimals = 0,
  prefix = '',
  suffix = '',
  duration = 1100,
}: {
  to: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(() => (0).toFixed(decimals));

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || !('IntersectionObserver' in window)) {
      setDisplay(to.toFixed(decimals));
      return;
    }

    let raf = 0;
    let fired = false;

    const run = () => {
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        if (t < 1) {
          setDisplay((to * eased).toFixed(decimals));
          raf = requestAnimationFrame(tick);
        } else {
          setDisplay(to.toFixed(decimals));
        }
      };
      raf = requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !fired) {
          fired = true;
          io.disconnect();
          run();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);

    return () => {
      io.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [to, decimals, duration]);

  return (
    <span ref={ref} style={{ fontVariantNumeric: 'tabular-nums' }}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}
