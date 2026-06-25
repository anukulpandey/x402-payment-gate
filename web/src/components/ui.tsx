import { useState, type ReactNode } from 'react';

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
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
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium',
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

export function Copyable({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        });
      }}
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
