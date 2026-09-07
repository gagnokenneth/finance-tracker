import { PendingBadge } from '../../components/PendingBadge.tsx'
import { SelectInput } from '../../components/ui.tsx'
import { isTemp } from '../../lib/tempId.ts'
import type { Task, TaskColumn } from '../../types.ts'

/**
 * One card on the board. `onMove` fires with the chosen column's id — the
 * caller (Tasks.tsx) owns turning that into a moveTask call, since only it
 * knows the done column and how to compute completed_date/next_date.
 */
export function TaskCard({
  task,
  columns,
  onMove,
  onClick,
}: {
  task: Task
  columns: TaskColumn[]
  onMove: (columnId: number) => void
  onClick: () => void
}) {
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
      {!pending && (
        <div className="mt-2 flex items-center gap-1.5">
          <SelectInput
            value=""
            onChange={(e) => {
              if (e.target.value) onMove(Number(e.target.value))
            }}
            className="!w-auto text-xs"
          >
            <option value="">Move to…</option>
            {columns
              .filter((c) => c.id !== task.column_id)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </SelectInput>
        </div>
      )}
    </div>
  )
}
