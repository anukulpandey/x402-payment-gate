import { useState } from 'react';
import { api, usd, timeAgo, type Endpoint } from '../lib/api';
import { Badge, Card, Copyable, cx } from './ui';

export function EndpointCard({
  endpoint,
  onRun,
  onChanged,
}: {
  endpoint: Endpoint;
  onRun: (e: Endpoint) => void;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const s = endpoint.stats;

  async function toggle() {
    setBusy(true);
    setErr(null);
    try {
      await api.patch(endpoint.id, { active: !endpoint.active });
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm(`Delete "${endpoint.name}"? This removes its gate and history.`)) return;
    setBusy(true);
    setErr(null);
    try {
      await api.remove(endpoint.id);
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className={cx('flex flex-col gap-3 p-4 transition', !endpoint.active && 'opacity-60')}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-white">{endpoint.name}</h3>
            <Badge tone="slate">{endpoint.method}</Badge>
            {!endpoint.active && <Badge tone="amber">paused</Badge>}
            {endpoint.requireIdentity && <Badge tone="violet">🆔 verified</Badge>}
            {!!endpoint.minReputation && <Badge tone="violet">⭐ {endpoint.minReputation}+</Badge>}
          </div>
          <div className="mt-0.5 truncate font-mono text-[11px] text-slate-500" title={endpoint.upstreamUrl}>
            → {endpoint.upstreamUrl}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-base font-semibold text-accent-300">${endpoint.priceUsd}</div>
          <div className="text-[10px] uppercase tracking-wide text-slate-500">/ call</div>
        </div>
      </div>

      <Copyable text={endpoint.gatedUrl} />

      <div className="grid grid-cols-3 gap-2 rounded-xl border border-white/8 bg-black/20 p-2.5 text-center">
        <Stat label="Paid calls" value={String(s.paidCalls)} sub={`${s.totalRequests} reqs`} />
        <Stat label="You earned" value={usd(s.earningsUsd)} sub="your 90%" accent />
        <Stat label="GateKeep fee" value={usd(s.feeUsd)} sub={timeAgo(s.lastCallTs)} />
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onRun(endpoint)}
          disabled={!endpoint.active}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-accent-500/90 px-3 py-2 text-xs font-semibold text-white transition hover:bg-accent-400 disabled:opacity-50"
        >
          ▶ Run agent
        </button>
        <button
          onClick={toggle}
          disabled={busy}
          className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-xs text-slate-300 transition hover:text-white disabled:opacity-50"
          title={endpoint.active ? 'Pause gate' : 'Resume gate'}
        >
          {endpoint.active ? '⏸' : '▷'}
        </button>
        <button
          onClick={remove}
          disabled={busy}
          className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-xs text-slate-400 transition hover:border-red-500/30 hover:text-red-300 disabled:opacity-50"
          title="Delete gate"
        >
          🗑
        </button>
      </div>

      {err && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-1.5 text-[11px] text-red-300">
          {err}
        </div>
      )}
    </Card>
  );
}

function Stat({ label, value, sub, accent }: { label: string; value: string; sub: string; accent?: boolean }) {
  return (
    <div>
      <div className={cx('text-sm font-semibold', accent ? 'text-emerald-300' : 'text-white')}>{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="text-[10px] text-slate-600">{sub}</div>
    </div>
  );
}
