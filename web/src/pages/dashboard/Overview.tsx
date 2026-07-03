import { Link } from 'react-router-dom';
import { useDashboard } from '../../lib/dashboard';
import { usd, type Endpoint } from '../../lib/api';
import { Badge, Card, Copyable, btn, cx } from '../../components/ui';
import { StatsBar } from '../../components/StatsBar';
import { CallFeed } from '../../components/CallFeed';

const QUICK_ACTIONS = [
  { emoji: '🔒', label: 'New', title: 'Create a gate', to: '/app/gates', sub: 'wrap an API in a paywall' },
  { emoji: '💸', label: 'Cash out', title: 'Withdraw earnings', to: '/app/payouts', sub: '' },
  { emoji: '📈', label: 'Insights', title: 'View analytics', to: '/app/analytics', sub: 'revenue & traffic' },
] as const;

export function Overview() {
  const { stats, endpoints, calls, loaded } = useDashboard();

  return (
    <div className="space-y-6">
      <StatsBar stats={stats} />

      {/* Quick actions */}
      <div className="grid gap-3 sm:grid-cols-3">
        {QUICK_ACTIONS.map((a) => (
          <Link
            key={a.to}
            to={a.to}
            className={cx(
              'group block rounded-2xl border border-white/8 bg-white/[0.03] p-4',
              'shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset] transition hover:border-accent-500/40',
            )}
          >
            <div className="flex items-center justify-between">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent-500/10 text-lg">{a.emoji}</span>
              <span className="text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-accent-300">→</span>
            </div>
            <div className="mt-3 text-sm font-semibold text-white">{a.title}</div>
            <div className="mt-0.5 text-xs text-slate-400">
              {a.to === '/app/payouts' ? `${usd(stats?.availableUsd ?? 0)} available` : a.sub}
            </div>
          </Link>
        ))}
      </div>

      {/* Gates summary + recent activity */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="flex flex-col lg:col-span-2">
          <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Your gates</h2>
            <Link to="/app/gates" className="text-xs text-accent-300 transition hover:text-accent-200">
              Manage all →
            </Link>
          </div>

          {loaded && endpoints.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-12 text-center">
              <p className="text-sm text-slate-500">No gates yet.</p>
              <Link to="/app/gates" className={btn('primary', 'sm')}>
                Create your first gate
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {endpoints.slice(0, 4).map((e) => (
                <GateRow key={e.id} endpoint={e} />
              ))}
            </div>
          )}
        </Card>

        <div className="space-y-3">
          <CallFeed calls={calls.slice(0, 8)} />
          <Link to="/app/activity" className="block text-xs text-accent-300 transition hover:text-accent-200">
            View all activity →
          </Link>
        </div>
      </div>
    </div>
  );
}

function GateRow({ endpoint: e }: { endpoint: Endpoint }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-white">{e.name}</span>
          <Badge tone="slate">{e.method}</Badge>
          {!e.active && <Badge tone="amber">paused</Badge>}
        </div>
        <div className="mt-1.5">
          <Copyable text={e.gatedUrl} label={`/g/${e.id}`} />
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className="text-sm font-semibold text-emerald-300">{usd(e.stats.earningsUsd)}</div>
        <div className="text-[11px] text-slate-500">{e.stats.paidCalls} paid</div>
      </div>
    </div>
  );
}
