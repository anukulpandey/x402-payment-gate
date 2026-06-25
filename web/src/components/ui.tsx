import { useState, type ButtonHTMLAttributes, type ReactNode } from 'react';

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('mx-auto w-full max-w-6xl px-5 sm:px-6', className)}>{children}</div>;
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline';
type Size = 'sm' | 'md' | 'lg';

export function btn(variant: Variant = 'primary', size: Size = 'md'): string {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-xl font-semibold whitespace-nowrap transition disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/40';
  const sizes: Record<Size, string> = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-5 py-3 text-[15px]',
  };
  const variants: Record<Variant, string> = {
    primary: 'bg-accent-500 text-white shadow-lg shadow-accent-600/30 hover:bg-accent-400',
    secondary: 'bg-white/8 text-white hover:bg-white/12 border border-white/10',
    ghost: 'text-slate-300 hover:text-white hover:bg-white/5',
    outline: 'border border-white/15 text-white hover:border-accent-500/50 hover:bg-white/5',
  };
  return cx(base, sizes[size], variants[variant]);
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  children,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; loading?: boolean }) {
  return (
    <button className={cx(btn(variant, size), className)} disabled={loading || props.disabled} {...props}>
      {loading && <Spinner />}
      {children}
    </button>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cx(
        'rounded-2xl border border-white/8 bg-white/[0.03] backdrop-blur-sm',
        'shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset]',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Badge({
  children,
  tone = 'slate',
}: {
  children: ReactNode;
  tone?: 'slate' | 'green' | 'amber' | 'violet' | 'red';
}) {
  const tones: Record<string, string> = {
    slate: 'bg-white/5 text-slate-300 border-white/10',
    green: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
    amber: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
    violet: 'bg-accent-500/10 text-accent-300 border-accent-500/25',
    red: 'bg-red-500/10 text-red-300 border-red-500/20',
  };
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium',
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-accent-500/25 bg-accent-500/10 px-3 py-1 text-[12px] font-medium text-accent-300">
      {children}
    </span>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  sub,
  center,
}: {
  eyebrow?: string;
  title: ReactNode;
  sub?: ReactNode;
  center?: boolean;
}) {
  return (
    <div className={cx('max-w-2xl', center && 'mx-auto text-center')}>
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{title}</h2>
      {sub && <p className="mt-3 text-[15px] leading-relaxed text-slate-400">{sub}</p>}
    </div>
  );
}

export function Copyable({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() =>
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        })
      }
      className="group inline-flex max-w-full items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-2.5 py-1.5 font-mono text-xs text-slate-300 transition hover:border-accent-500/40 hover:text-white"
      title="Copy"
    >
      <span className="truncate">{label ?? text}</span>
      <span className={cx('shrink-0 transition', copied ? 'text-emerald-400' : 'text-slate-500 group-hover:text-accent-300')}>
        {copied ? '✓' : '⧉'}
      </span>
    </button>
  );
}

export function Json({ value }: { value: unknown }) {
  return (
    <pre className="overflow-x-auto rounded-lg border border-white/10 bg-black/40 p-3 font-mono text-[11.5px] leading-relaxed text-slate-300">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cx('animate-spin', className)} viewBox="0 0 24 24" fill="none" width="16" height="16">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.2" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
