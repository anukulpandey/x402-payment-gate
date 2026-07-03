import { Card } from '../ui';
import { Donut } from '../charts/Donut';

function statusColor(status: number): string {
  if (status >= 200 && status <= 299) return '#34d399';
  if (status === 402) return '#fbbf24';
  if (status === 403) return '#fb923c';
  if (status >= 500) return '#f87171';
  return '#64748b';
}

export function StatusPanel({ statusCodes }: { statusCodes: { status: number; count: number }[] }) {
  const sorted = [...statusCodes].sort((a, b) => b.count - a.count);
  const top = sorted.slice(0, 5);
  const rest = sorted.slice(5);
  const slices = top.map((s) => ({ label: String(s.status), value: s.count, color: statusColor(s.status) }));
  const otherTotal = rest.reduce((sum, s) => sum + s.count, 0);
  if (otherTotal > 0) {
    slices.push({ label: 'other', value: otherTotal, color: '#64748b' });
  }
  const total = statusCodes.reduce((sum, s) => sum + s.count, 0);
  return (
    <Card>
      <div className='px-4 py-3 border-b border-white/8'>
        <h3 className='text-sm font-semibold text-white'>Status codes</h3>
      </div>
      <div className='p-4 flex justify-center'>
        <Donut slices={slices} centerLabel={{ value: String(total), sub: 'calls' }} />
      </div>
    </Card>
  );
}
