import type { PlatformStats } from '../api';
import { usd } from '../api';
import { Card } from './ui';

export function StatsBar({ stats }: { stats: PlatformStats | null }) {
  const tiles = [
    {
      label: 'Your revenue',
      value: usd(stats?.platformRevenueUsd ?? 0),
      hint: 'platform cut of every call',
      accent: true,
    },
    { label: 'Gross volume', value: usd(stats?.grossUsd ?? 0), hint: 'total paid by agents' },
    { label: 'Paid calls', value: String(stats?.paidCalls ?? 0), hint: 'settled requests' },
    { label: 'Seller payouts', value: usd(stats?.sellerPayoutUsd ?? 0), hint: 'owed to API owners' },
    { label: 'Gated APIs', value: String(stats?.endpoints ?? 0), hint: 'endpoints live' },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {tiles.map((t) => (
        <Card
          key={t.label}
          className={t.accent ? 'p-4 ring-1 ring-accent-500/30' : 'p-4'}
        >
          <div className="text-[11px] uppercase tracking-wide text-slate-400">{t.label}</div>
          <div
            className={
              'mt-1 text-2xl font-semibold tracking-tight ' +
              (t.accent ? 'text-accent-300' : 'text-white')
            }
          >
            {t.value}
          </div>
          <div className="mt-0.5 text-[11px] text-slate-500">{t.hint}</div>
        </Card>
      ))}
    </div>
  );
}
