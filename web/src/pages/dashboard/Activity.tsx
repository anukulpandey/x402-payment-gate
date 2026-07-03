import { useState } from 'react'
import { useDashboard } from '../../lib/dashboard'
import { CallFeed } from '../../components/CallFeed'
import { Card, cx } from '../../components/ui'

export function Activity() {
  const { calls, loaded } = useDashboard()
  const [filter, setFilter] = useState<'all' | 'paid' | 'unpaid'>('all')

  const shown =
    filter === 'all'
      ? calls
      : filter === 'paid'
        ? calls.filter((c) => c.paid)
        : calls.filter((c) => !c.paid)

  const filters: { value: 'all' | 'paid' | 'unpaid'; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'paid', label: 'Paid' },
    { value: 'unpaid', label: 'Unpaid' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-white">Activity</h2>
          <span className="text-xs text-slate-500">{shown.length} calls</span>
        </div>
        <div className="inline-flex rounded-xl border border-white/10 bg-white/5 p-0.5">
          {filters.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={cx(
                'px-3 py-1.5 text-xs font-medium rounded-lg transition',
                filter === f.value
                  ? 'bg-accent-500/20 text-white'
                  : 'text-slate-400 hover:text-white',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loaded && calls.length === 0 ? (
        <Card className="px-4 py-8 text-center text-sm text-slate-400">
          No calls yet — run the agent or generate demo traffic in Analytics.
        </Card>
      ) : loaded && shown.length === 0 ? (
        <Card className="px-4 py-8 text-center text-sm text-slate-500">
          No {filter} calls in the recent activity.
        </Card>
      ) : (
        <CallFeed calls={shown} />
      )}
    </div>
  )
}
