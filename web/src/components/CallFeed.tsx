import { usd, timeAgo, shortAddr, type CallRecord } from '../lib/api';
import { Card } from './ui';

export function CallFeed({ calls }: { calls: CallRecord[] }) {
  return (
    <Card className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
        <h3 className="text-sm font-semibold text-white">Live activity</h3>
        <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 pulse-ring" /> streaming
        </span>
      </div>
      <div className="max-h-[520px] flex-1 divide-y divide-white/5 overflow-y-auto">
        {calls.length === 0 && (
          <div className="px-4 py-10 text-center text-sm text-slate-500">
            No calls yet. Hit <b className="text-slate-300">Run agent</b> on an endpoint.
          </div>
        )}
        {calls.map((c) => (
          <div key={c.id} className="fade-up flex items-center gap-3 px-4 py-2.5 text-xs">
            <StatusDot call={c} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-slate-200">{c.method}</span>
                <span className="truncate text-slate-400">{c.endpointName}</span>
              </div>
              <div className="truncate text-[11px] text-slate-500">
                {c.paid ? (
                  <>
                    {c.agentId ? `agent #${c.agentId}` : shortAddr(c.payer)}
                    {c.agentId ? ` ⭐${c.agentReputation ?? 0}` : ''} paid {usd(c.amountUsd)}
                    {c.txHash ? ` · tx ${shortAddr(c.txHash)}` : ''}
                  </>
                ) : c.status === 403 ? (
                  <>403 — {c.agentId ? 'reputation too low' : 'identity required'}</>
                ) : (
                  <>402 — payment required</>
                )}
              </div>
            </div>
            <div className="shrink-0 text-right">
              <div className={c.paid ? 'font-medium text-emerald-300' : 'text-slate-500'}>
                {c.paid ? `+${usd(c.sellerEarningsUsd)}` : `${c.status}`}
              </div>
              <div className="text-[10px] text-slate-600">{timeAgo(c.ts)}</div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function StatusDot({ call }: { call: CallRecord }) {
  const color = call.paid
    ? 'bg-emerald-400'
    : call.status >= 500
      ? 'bg-red-400'
      : 'bg-amber-400';
  return <span className={`mt-1 h-2 w-2 shrink-0 self-start rounded-full ${color}`} />;
}
