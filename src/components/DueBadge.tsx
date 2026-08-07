import { dueStatus, DUE_STATUS_LABEL, DUE_STATUS_CLASS } from '../lib/debts.ts'

/** Due date plus its status. The label carries the meaning; colour reinforces it. */
export function DueBadge({ dueDate }: { dueDate: string | null }) {
  if (!dueDate) return <span className="text-slate-400">—</span>
  const status = dueStatus(dueDate)
  return (
    <span className="inline-flex items-center gap-2">
      <span className="tabular-nums">{dueDate}</span>
      <span
        className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${DUE_STATUS_CLASS[status]}`}
      >
        {DUE_STATUS_LABEL[status]}
      </span>
    </span>
  )
}
