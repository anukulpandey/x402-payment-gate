import type { DeltaStat } from '../../lib/api';
import { Badge, Card, cx } from '../ui';
import { Sparkline } from '../charts/Sparkline';

function DeltaChip({ delta, goodWhen }: { delta: DeltaStat; goodWhen: 'up' | 'down' }) {
  if (delta.deltaPct === null) return <Badge tone='violet'>new</Badge>;
  if (delta.deltaPct === 0) return <span className='text-xs text-slate-500'>—</span>;
  const arrow = delta.deltaPct > 0 ? '▲' : '▼';
  const improving = (delta.deltaPct > 0) === (goodWhen === 'up');
  const color = improving ? 'text-emerald-400' : 'text-red-400';
  return (
    <span className={cx('text-xs font-medium', color)} title='vs prior period'>
      {arrow} {Math.abs(delta.deltaPct)}%
    </span>
  );
}

export function KpiCard({
  label,
  value,
  delta,
  spark,
  goodWhen = 'up',
  format,
}: {
  label: string;
  value: string;
  delta: DeltaStat;
  spark: number[];
  goodWhen?: 'up' | 'down';
  format?: (v: number) => string;
}) {
  const latest = spark.length > 0 ? spark[spark.length - 1] : undefined;
  return (
    <Card className='p-4'>
      <div className='flex items-center justify-between gap-2'>
        <div className='uppercase tracking-wide text-[11px] text-slate-400 font-medium'>{label}</div>
        <DeltaChip delta={delta} goodWhen={goodWhen} />
      </div>
      <div className='mt-1 text-2xl font-semibold text-white font-mono'>{value}</div>
      <div className='mt-3' title={format && latest !== undefined ? format(latest) : undefined}>
        <Sparkline values={spark} />
      </div>
    </Card>
  );
}
