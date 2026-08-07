import { dueStatus } from '../lib/debts.ts'
import { StatusBadge } from './StatusBadge.tsx'

/** Due date plus its status. The label carries the meaning; colour reinforces it. */
export function DueBadge({ dueDate }: { dueDate: string | null }) {
  if (!dueDate) return <span className="font-mono text-sm text-ink-faint">—</span>
  return (
    <span className="inline-flex items-center gap-2">
      <span className="tnum font-mono text-sm text-ink">{dueDate}</span>
      <StatusBadge status={dueStatus(dueDate)} />
    </span>
  )
}
