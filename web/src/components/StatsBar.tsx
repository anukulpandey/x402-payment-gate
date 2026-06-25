import type { SellerStats } from '../lib/api';
import { usd } from '../lib/api';
import { Card, cx } from './ui';

export function StatsBar({ stats }: { stats: SellerStats | null }) {
  // Kept lean: total earned (headline), paid calls, live gates. Withdrawable
  // balance + payouts live in the card below.
  const tiles = [
    { label: 'Total earned', value: usd(stats?.earningsUsd ?? 0), hint: 'your 90% of every call', accent: true },
    { label: 'Paid calls', value: String(stats?.paidCalls ?? 0), hint: 'settled by agents' },
    { label: 'Live gates', value: String(stats?.endpoints ?? 0), hint: 'gated endpoints' },
  ];
  return (
    <div className="grid grid-cols-3 gap-3">
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
