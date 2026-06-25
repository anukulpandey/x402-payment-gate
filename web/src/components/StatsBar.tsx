import type { SellerStats } from '../lib/api';
import { usd } from '../lib/api';
import { Card, cx } from './ui';

export function StatsBar({ stats }: { stats: SellerStats | null }) {
  const tiles = [
    { label: 'Your earnings', value: usd(stats?.earningsUsd ?? 0), hint: 'paid to your wallet', accent: true },
    { label: 'Gross volume', value: usd(stats?.grossUsd ?? 0), hint: 'total agents paid you' },
    { label: 'Paid calls', value: String(stats?.paidCalls ?? 0), hint: 'settled requests' },
    { label: 'GateKeep fee', value: usd(stats?.feeUsd ?? 0), hint: 'flat 10% cut' },
    { label: 'Gated APIs', value: String(stats?.endpoints ?? 0), hint: 'endpoints live' },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {tiles.map((t) => (
        <Card key={t.label} className={cx('p-4', t.accent && 'ring-1 ring-emerald-500/30')}>
          <div className="text-[11px] uppercase tracking-wide text-slate-400">{t.label}</div>
          <div className={cx('mt-1 text-2xl font-semibold tracking-tight', t.accent ? 'text-emerald-300' : 'text-white')}>
            {t.value}
          </div>
          <div className="mt-0.5 text-[11px] text-slate-500">{t.hint}</div>
        </Card>
      ))}
    </div>
  );
}
