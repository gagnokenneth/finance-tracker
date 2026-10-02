import { useDraggableTask } from '../../hooks/useDraggableTask.ts'
import { PendingBadge } from '../../components/PendingBadge.tsx'
import { cardClass } from '../../components/brutal.tsx'
import type { Task } from '../../types.ts'

/**
 * One card on the board — click to open its detail popup, where editing
 * and moving between columns happens. Also draggable onto another column's
 * lane, which calls the same moveTask path as the popup's buttons.
 */
export function TaskCard({ task, onClick }: { task: Task; onClick: () => void }) {
  const { pending, setNodeRef, dragAttributes, dragListeners, style, isDragging } = useDraggableTask(task)

  return (
    <div
      ref={setNodeRef}
      {...dragAttributes}
      {...dragListeners}
      style={style}
      className={`${cardClass} ${isDragging ? 'opacity-50' : ''}`}
    >
      <button type="button" onClick={onClick} className="block w-full space-y-2 p-4 text-left" disabled={pending}>
        <div className="flex items-start justify-between gap-2">
          <span className="text-sm font-bold tracking-tight text-black">{task.title}</span>
          {pending && <PendingBadge />}
        </div>
        {task.date && <p className="tnum font-mono text-xs text-neutral-400">{task.date}</p>}
      </button>
    </div>
  )
}
