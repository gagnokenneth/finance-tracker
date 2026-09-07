import { PendingBadge } from '../../components/PendingBadge.tsx'
import { isTemp } from '../../lib/tempId.ts'
import type { Task } from '../../types.ts'

/**
 * One card on the board — click to open its detail popup, where editing
 * and moving between columns happens.
 */
export function TaskCard({ task, onClick }: { task: Task; onClick: () => void }) {
  const pending = isTemp(task.id)
  return (
    <div className="rounded-lg border border-edge bg-white p-3 shadow-sm">
      <button type="button" onClick={onClick} className="block w-full text-left" disabled={pending}>
        <div className="flex items-start justify-between gap-2">
          <span className="text-sm font-medium text-ink">{task.title}</span>
          {pending && <PendingBadge />}
        </div>
        {task.date && <p className="mt-1 text-xs text-ink-faint">{task.date}</p>}
      </button>
    </div>
  )
}
