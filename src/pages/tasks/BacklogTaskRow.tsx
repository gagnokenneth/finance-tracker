import { useDraggableTask } from '../../hooks/useDraggableTask.ts'
import { Pill } from '../../components/StatusBadge.tsx'
import { PendingBadge } from '../../components/PendingBadge.tsx'
import type { Task, TaskColumn } from '../../types.ts'

/**
 * One row in the Backlog list — draggable onto a board column exactly like
 * a TaskCard is, so an undated task can be scheduled by dropping it
 * straight from the list without opening its detail popup first.
 */
export function BacklogTaskRow({
  task,
  column,
  onClick,
}: {
  task: Task
  column: TaskColumn | undefined
  onClick: () => void
}) {
  const { pending, setNodeRef, dragAttributes, dragListeners, style, isDragging } = useDraggableTask(task)

  return (
    <div
      ref={setNodeRef}
      {...dragAttributes}
      {...dragListeners}
      style={style}
      className={isDragging ? 'opacity-50' : ''}
    >
      <button
        type="button"
        disabled={pending}
        onClick={onClick}
        className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors hover:bg-paper focus-visible:relative focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand disabled:pointer-events-none disabled:opacity-60"
      >
        <span className="truncate text-sm font-medium text-ink">{task.title}</span>
        <div className="flex shrink-0 items-center gap-2">
          {pending && <PendingBadge />}
          {column && (
            <Pill
              label={column.name}
              className={
                column.is_done
                  ? 'bg-settled-wash text-settled ring-settled/20'
                  : 'bg-paper text-ink-soft ring-ink-faint/30'
              }
            />
          )}
        </div>
      </button>
    </div>
  )
}
