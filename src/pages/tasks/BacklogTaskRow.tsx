import { useDraggableTask } from '../../hooks/useDraggableTask.ts'
import { PendingBadge } from '../../components/PendingBadge.tsx'
import { cardClass } from '../../components/brutal.tsx'
import type { Task } from '../../types.ts'

/**
 * One row in the Backlog list — draggable onto a board column exactly like
 * a TaskCard is, so an undated task can be scheduled by dropping it
 * straight from the list without opening its detail popup first.
 */
export function BacklogTaskRow({ task, onClick }: { task: Task; onClick: () => void }) {
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
        className={`${cardClass} flex w-full items-center justify-between gap-3 px-4 py-3 text-left disabled:pointer-events-none disabled:opacity-60`}
      >
        <span className="truncate text-sm font-bold tracking-tight text-black">{task.title}</span>
        {pending && <PendingBadge />}
      </button>
    </div>
  )
}
