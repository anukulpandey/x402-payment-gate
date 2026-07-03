import type { EndpointBreakdownRow } from '../../lib/api';
import { ms, pct, usd } from '../../lib/api';
import { Badge, Card } from '../ui';

function errorTone(errorRatePct: number): 'red' | 'amber' | 'slate' {
  if (errorRatePct > 20) return 'red';
  if (errorRatePct > 5) return 'amber';
  return 'slate';
}

const HEADERS = ['Endpoint', 'Calls', 'Revenue', 'Latency', 'Errors', 'Share'];

export function EndpointTable({ rows }: { rows: EndpointBreakdownRow[] }) {
  return (
    <Card>
      <div className='px-4 py-3 border-b border-white/8'>
        <h3 className='text-sm font-semibold text-white'>Endpoints</h3>
      </div>
      {rows.length === 0 ? (
        <div className='px-4 py-8 text-center text-slate-500'>No endpoints yet.</div>
      ) : (
        <div className='overflow-x-auto'>
          <table className='w-full text-xs'>
            <thead>
              <tr>
                {HEADERS.map((h) => (
                  <th key={h} className='text-slate-500 text-left font-medium px-4 py-2'>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className='divide-y divide-white/5'>
              {rows.map((row) => (
                <tr key={row.endpointId}>
                  <td className='px-4 py-2'>
                    <div className='flex items-center gap-2'>
                      <span className='text-white truncate max-w-[160px]'>{row.name}</span>
                      {!row.active && <Badge tone='amber'>paused</Badge>}
                    </div>
                  </td>
                  <td className='px-4 py-2 font-mono'>{row.calls}</td>
                  <td className='px-4 py-2 font-mono text-white'>{usd(row.grossUsd)}</td>
                  <td className='px-4 py-2 font-mono text-slate-400'>{ms(row.avgLatencyMs)}</td>
                  <td className='px-4 py-2'>
                    <Badge tone={errorTone(row.errorRatePct)}>{pct(row.errorRatePct)}</Badge>
                  </td>
                  <td className='px-4 py-2 min-w-[90px]'>
                    <div className='h-1.5 w-full rounded-full bg-white/5'>
                      <div
                        className='h-full rounded-full bg-accent-500'
                        style={{ width: row.revenueSharePct + '%' }}
                      />
                    </div>
                    <span className='text-[10px] text-slate-500'>{pct(row.revenueSharePct)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
