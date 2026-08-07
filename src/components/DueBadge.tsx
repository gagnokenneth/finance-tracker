import { dueStatus } from '../lib/debts.ts'
import { StatusBadge } from './StatusBadge.tsx'

/** Due date plus its status. The label carries the meaning; colour reinforces it. */
export function DueBadge({ dueDate }: { dueDate: string | null }) {
  if (!dueDate) return <span className="text-slate-400">—</span>
  return (
    <span className="inline-flex items-center gap-2">
      <span className="tabular-nums">{dueDate}</span>
      <StatusBadge status={dueStatus(dueDate)} />
    </span>
  )
}
