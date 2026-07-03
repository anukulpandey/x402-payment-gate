import { useDashboard } from '../../lib/dashboard';
import { usd, timeAgo } from '../../lib/api';
import { Card, Badge } from '../../components/ui';
import { PayoutsCard } from '../../components/PayoutsCard';

// Fuji testnet explorer
const explorer = (h: string) => `https://testnet.snowtrace.io/tx/${h}`;

export function Payouts() {
  const { address, stats, endpoints, withdrawals, refresh } = useDashboard();

  const rows = [...endpoints].sort((a, b) => b.stats.earningsUsd - a.stats.earningsUsd);

  return (
    <div className="space-y-6">
      <PayoutsCard stats={stats} address={address} onWithdrawn={refresh} />

      <Card className="overflow-hidden">
        <div className="border-b border-white/8 px-5 py-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Earnings by gate</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-slate-500">
              <tr className="border-b border-white/8 text-left">
                <th className="px-5 py-2.5 font-medium">Gate</th>
                <th className="px-5 py-2.5 text-right font-medium">Paid calls</th>
                <th className="px-5 py-2.5 text-right font-medium">Gross</th>
                <th className="px-5 py-2.5 text-right font-medium">You earned</th>
                <th className="px-5 py-2.5 text-right font-medium">Fee</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-6 text-center text-slate-500">
                    No gates yet.
                  </td>
                </tr>
              ) : (
                rows.map((e) => (
                  <tr key={e.id}>
                    <td className="px-5 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="max-w-[180px] truncate text-white">{e.name}</span>
                        {!e.active && <Badge>inactive</Badge>}
                      </div>
                    </td>
                    <td className="px-5 py-2.5 text-right text-slate-300">{e.stats.paidCalls}</td>
                    <td className="px-5 py-2.5 text-right text-slate-300">{usd(e.stats.grossUsd)}</td>
                    <td className="px-5 py-2.5 text-right text-white">{usd(e.stats.earningsUsd)}</td>
                    <td className="px-5 py-2.5 text-right text-slate-400">{usd(e.stats.feeUsd)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-white/8 px-5 py-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Withdrawal history</h2>
        </div>
        {withdrawals.length ? (
          <ul className="divide-y divide-white/5">
            {withdrawals.map((w) => (
              <li key={w.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <span className="font-mono text-white">{usd(w.amountUsd)}</span>
                  <span className="block text-xs text-slate-500">{timeAgo(w.ts)}</span>
                </div>
                <a
                  href={explorer(w.txHash)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-accent-300 hover:text-accent-200"
                >
                  view tx ↗
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 py-6 text-center text-sm text-slate-500">
            No withdrawals yet — earnings show up here once you withdraw.
          </p>
        )}
      </Card>
    </div>
  );
}
