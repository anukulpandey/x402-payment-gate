import type { LatencyStats } from '../../lib/api';
import { ms } from '../../lib/api';
import { Card } from '../ui';

const TILES: { key: 'p50' | 'p95' | 'avg' | 'max'; label: string }[] = [
  { key: 'p50', label: 'p50' },
  { key: 'p95', label: 'p95' },
  { key: 'avg', label: 'avg' },
  { key: 'max', label: 'max' },
];

export function LatencyPanel({ latency }: { latency: LatencyStats }) {
  return (
    <Card>
      <div className='px-4 py-3 border-b border-white/8'>
        <h3 className='text-sm font-semibold text-white'>Latency</h3>
      </div>
      <div className='p-4'>
        <div className='grid grid-cols-2 gap-3'>
          {TILES.map((tile) => (
            <div key={tile.key}>
              <div className='text-[10px] uppercase text-slate-500'>{tile.label}</div>
              <div className='font-mono text-lg text-white'>{ms(latency[tile.key])}</div>
            </div>
          ))}
        </div>
        <div className='relative h-1.5 rounded-full bg-white/5 mt-5'>
          {latency.max > 0 && (
            <>
              <div
                className='absolute w-0.5 h-3 -top-[3px] rounded bg-accent-400'
                style={{ left: (latency.p50 / latency.max) * 100 + '%' }}
              />
              <div
                className='absolute w-0.5 h-3 -top-[3px] rounded bg-amber-400'
                style={{ left: (latency.p95 / latency.max) * 100 + '%' }}
              />
            </>
          )}
        </div>
        <div className='text-[10px] text-slate-500 mt-2'>
          {latency.count} calls measured · ticks mark p50 / p95
        </div>
      </div>
    </Card>
  );
}
