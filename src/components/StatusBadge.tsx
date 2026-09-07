import { ROW_STATUS_LABEL, ROW_STATUS_CLASS } from '../lib/debts.ts'
import type { RowStatus } from '../lib/debts.ts'

/**
 * The bare pill markup, colour driven entirely by `className` — shared by
 * StatusBadge (below, for a due-state RowStatus) and any other status enum
 * that wants the same look (e.g. Goals) without adopting RowStatus itself.
 */
export function Pill({ label, className }: { label: string; className: string }) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${className}`}
    >
      {label}
    </span>
  )
}

export function StatusBadge({ status }: { status: RowStatus }) {
  return <Pill label={ROW_STATUS_LABEL[status]} className={ROW_STATUS_CLASS[status]} />
}
