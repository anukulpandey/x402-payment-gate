import { useEffect, useRef, useState } from 'react';
import { api, usd, shortAddr, type Endpoint, type SimResult, type SimStep, type StepKind } from '../lib/api';
import { Badge, Json, Spinner, cx } from './ui';

const STEP_META: Record<StepKind, { icon: string; ring: string }> = {
  request: { icon: '📤', ring: 'border-slate-500/40 bg-slate-500/10' },
  quote: { icon: '🧾', ring: 'border-amber-500/40 bg-amber-500/10' },
  sign: { icon: '✍️', ring: 'border-accent-500/40 bg-accent-500/10' },
  pay: { icon: '💸', ring: 'border-accent-500/40 bg-accent-500/10' },
  settle: { icon: '⛓️', ring: 'border-sky-500/40 bg-sky-500/10' },
  deliver: { icon: '📦', ring: 'border-emerald-500/40 bg-emerald-500/10' },
  split: { icon: '💰', ring: 'border-emerald-500/40 bg-emerald-500/10' },
};

export function Playground({
  endpoint,
  onClose,
  onDone,
}: {
  endpoint: Endpoint;
  onClose: () => void;
  onDone: () => void;
}) {
  const [result, setResult] = useState<SimResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(0);
  const [running, setRunning] = useState(true);
  const timers = useRef<number[]>([]);

  async function run() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setResult(null);
    setError(null);
    setRevealed(0);
    setRunning(true);
    try {
      const res = await api.simulate(endpoint.id);
      if (!res.ok) {
        setError(res.error || 'Simulation failed');
        setResult(res);
        setRunning(false);
        onDone();
        return;
      }
      setResult(res);
      // Reveal steps one at a time for a "live" feel.
      res.steps.forEach((_, i) => {
        const t = window.setTimeout(() => {
          setRevealed(i + 1);
          if (i === res.steps.length - 1) {
            setRunning(false);
            onDone();
          }
        }, 260 * (i + 1));
        timers.current.push(t);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Simulation failed');
      setRunning(false);
    }
  }

  useEffect(() => {
    run();
    return () => timers.current.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint.id]);

  const steps = result?.steps ?? [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm sm:p-8"
      onClick={onClose}
    >
      <div
        className="fade-up w-full max-w-2xl rounded-2xl border border-white/10 bg-[#0c0c14] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-white">Agent payment run</h3>
              {running ? (
                <Badge tone="violet">
                  <Spinner className="text-accent-300" /> running
                </Badge>
              ) : error ? (
                <Badge tone="red">failed</Badge>
              ) : (
                <Badge tone="green">settled</Badge>
              )}
            </div>
            <div className="mt-0.5 text-xs text-slate-400">
              {endpoint.name} · charges <b className="text-slate-200">${endpoint.priceUsd}</b> / call
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-slate-400 transition hover:bg-white/5 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* body */}
        <div className="max-h-[65vh] overflow-y-auto px-5 py-4">
          {error && (
            <div className="mb-3 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
              {typeof result?.detail !== 'undefined' && (
                <div className="mt-2">
                  <Json value={result.detail} />
                </div>
              )}
            </div>
          )}

          <ol className="relative space-y-1">
            {steps.slice(0, revealed).map((step, i) => (
              <StepRow key={step.n} step={step} last={i === steps.length - 1} />
            ))}
            {running && revealed < steps.length && (
              <li className="flex items-center gap-3 py-2 pl-1 text-sm text-slate-500">
                <Spinner className="text-accent-300" /> agent working…
              </li>
            )}
          </ol>

          {!running && !error && result?.ok && <SplitSummary result={result} />}
        </div>

        {/* footer */}
        <div className="flex items-center justify-between border-t border-white/8 px-5 py-3">
          <span className="text-xs text-slate-500">
            {result?.mode === 'mock'
              ? 'real EIP-712 signature · simulated settlement'
              : 'settled on-chain via x402 facilitator'}
            {result ? ` · ${result.durationMs}ms` : ''}
          </span>
          <button
            onClick={run}
            disabled={running}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-accent-500/40 hover:text-white disabled:opacity-50"
          >
            ↻ Run again
          </button>
        </div>
      </div>
    </div>
  );
}

function StepRow({ step, last }: { step: SimStep; last: boolean }) {
  const meta = STEP_META[step.kind];
  const showData =
    step.data !== undefined && ['quote', 'settle', 'deliver', 'split', 'sign'].includes(step.kind);
  return (
    <li className="fade-up relative flex gap-3 pb-3">
      {!last && <span className="absolute left-[15px] top-8 h-full w-px bg-white/10" />}
      <div
        className={cx(
          'z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full border text-sm',
          meta.ring,
        )}
      >
        {meta.icon}
      </div>
      <div className="min-w-0 flex-1 pt-0.5">
        <div className="text-sm font-medium text-slate-100">{step.title}</div>
        <div className="text-xs text-slate-400">{step.detail}</div>
        {showData && (
          <div className="mt-2">
            {step.kind === 'deliver' ? (
              <DeliverBody data={step.data} />
            ) : (
              <Json value={step.data} />
            )}
          </div>
        )}
      </div>
    </li>
  );
}

function DeliverBody({ data }: { data: unknown }) {
  const d = data as { bodyPreview?: string; contentType?: string };
  return (
    <pre className="overflow-x-auto rounded-lg border border-emerald-500/20 bg-emerald-500/[0.05] p-3 font-mono text-[11.5px] leading-relaxed text-emerald-100/90">
      {d.bodyPreview}
    </pre>
  );
}

function SplitSummary({ result }: { result: SimResult }) {
  const split = result.steps.find((s) => s.kind === 'split')?.data as
    | { grossUsd: number; platformFeeUsd: number; sellerEarningsUsd: number; payer?: string; txHash?: string }
    | undefined;
  if (!split) return null;
  return (
    <div className="mt-3 rounded-xl border border-accent-500/20 bg-accent-500/[0.06] p-4">
      <div className="mb-3 grid grid-cols-3 gap-2 text-center">
        <Money label="Agent paid" value={usd(split.grossUsd)} tone="white" />
        <Money label="You earn" value={usd(split.sellerEarningsUsd)} tone="emerald" />
        <Money label="GateKeep fee" value={usd(split.platformFeeUsd)} tone="accent" />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-2 text-[11px] text-slate-400">
        <span>
          payer <span className="font-mono text-slate-300">{shortAddr(split.payer)}</span>
        </span>
        {split.txHash && (
          <span className="truncate">
            tx <span className="font-mono text-slate-300">{shortAddr(split.txHash)}</span>
          </span>
        )}
      </div>
    </div>
  );
}

function Money({ label, value, tone }: { label: string; value: string; tone: 'white' | 'accent' | 'emerald' }) {
  const colors = { white: 'text-white', accent: 'text-accent-300', emerald: 'text-emerald-300' };
  return (
    <div>
      <div className={cx('text-lg font-semibold', colors[tone])}>{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
    </div>
  );
}
