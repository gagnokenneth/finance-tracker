import { ROW_STATUS_LABEL, ROW_STATUS_CLASS } from '../lib/debts.ts'
import type { RowStatus } from '../lib/debts.ts'

export function StatusBadge({ status }: { status: RowStatus }) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${ROW_STATUS_CLASS[status]}`}
    >
      {ROW_STATUS_LABEL[status]}
    </span>
  )
}
