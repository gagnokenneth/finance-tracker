import { Link } from 'react-router-dom'
import { Money } from './Money.tsx'
import { DueBadge } from './DueBadge.tsx'
import type { DueItem } from '../lib/dashboard.ts'

/**
 * One compact row on the Dashboard. Deliberately its own component rather than
 * the shared CardRow Bills and Debts use: those lists top out at a handful of
 * rows, but the Dashboard's Late/Due soon buckets grow with everything else
 * tracked, so its row needs to stay small as that list gets long.
 */
export function DueCard({ item }: { item: DueItem }) {
  return (
    <Link
      to={item.to}
      className="flex items-center justify-between gap-3 rounded-lg border border-edge bg-white px-3 py-2 transition-[box-shadow,border-color] hover:border-brand/30 hover:shadow-md hover:shadow-ink/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate text-sm font-medium text-ink">{item.label}</span>
        <span className="shrink-0 text-xs font-semibold tracking-wide text-ink-faint uppercase">
          {item.kind === 'bill' ? 'Bill' : 'Debt'}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <DueBadge dueDate={item.dueDate} />
        {item.amount !== undefined && (
          <Money value={item.amount} className="text-sm font-semibold" />
        )}
      </div>
    </Link>
  )
}
