import type { AnalyticsRange } from '../../lib/api';
import { cx } from '../ui';

const RANGES: AnalyticsRange[] = ['24h', '7d', '30d'];

export function RangeSwitcher({ value, onChange }: { value: AnalyticsRange; onChange: (r: AnalyticsRange) => void }) {
  return (
    <div className='inline-flex rounded-xl border border-white/10 bg-white/5 p-0.5'>
      {RANGES.map((r) => (
        <button
          key={r}
          type='button'
          onClick={() => onChange(r)}
          className={cx(
            'px-3 py-1.5 text-xs font-medium rounded-lg transition',
            value === r ? 'bg-accent-500/20 text-white' : 'text-slate-400 hover:text-white',
          )}
        >
          {r}
        </button>
      ))}
    </div>
  );
}
