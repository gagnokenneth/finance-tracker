import { useDroppable } from '@dnd-kit/core'
import { TaskCard } from './TaskCard.tsx'
import { groupByDay } from '../../lib/tasks.ts'
import { useInlineRename } from '../../hooks/useInlineRename.ts'
import { BrutalAddButton, inlineEditClass } from '../../components/brutal.tsx'
import type { Task, TaskColumn } from '../../types.ts'

/**
 * One column's lane. When `dayGrouped` is true (the "This week" scope),
 * cards are sub-headed by their date; Backlog scope renders them flat since
 * every card there has no date to group by.
 *
 * `onAddTask` is omitted (not just disabled) for the done column — there's
 * no such thing as adding a task that's already done, so the "+" simply
 * doesn't exist there rather than existing in a state that would need
 * explaining.
 */
export function TaskColumnLane({
  column,
  tasks,
  dayGrouped,
  onOpenTask,
  onRename,
  onAddTask,
}: {
  column: TaskColumn
  tasks: Task[]
  dayGrouped: boolean
  onOpenTask: (task: Task) => void
  onRename: (name: string) => void
  onAddTask?: () => void
}) {
  const rename = useInlineRename(column.name, onRename)
  const { setNodeRef, isOver } = useDroppable({ id: column.id })

  const days = dayGrouped ? [...groupByDay(tasks).entries()].sort(([a], [b]) => a.localeCompare(b)) : null

  const card = (task: Task) => <TaskCard key={task.id} task={task} onClick={() => onOpenTask(task)} />

  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[220px] min-w-0 flex-col bg-white ${isOver ? 'outline-2 -outline-offset-2 outline-black' : ''}`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-black bg-neutral-50 p-4">
        <div className="flex min-w-0 items-center gap-2">
          {column.is_done && (
            <span className="font-mono text-xs font-bold text-black" aria-hidden>
              ✓
            </span>
          )}
          {rename.renaming ? (
            <input
              autoFocus
              value={rename.draft}
              onChange={(e) => rename.setDraft(e.target.value)}
              onBlur={rename.save}
              onKeyDown={rename.onKeyDown}
              className={`${inlineEditClass} h-6 w-full min-w-0 px-1.5 text-sm font-bold tracking-tight text-black uppercase`}
            />
          ) : (
            <h3
              className="h-6 cursor-text truncate text-sm leading-6 font-bold tracking-tight text-black uppercase hover:underline"
              onClick={rename.start}
            >
              {column.name}
            </h3>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2.5">
          <span className="tnum font-mono text-xs font-bold text-neutral-500">{tasks.length}</span>
          {onAddTask && (
            <BrutalAddButton
              aria-label={`Add task to ${column.name}`}
              className="size-6 text-sm"
              onClick={onAddTask}
            />
          )}
        </div>
      </div>

      <div className="flex-1 p-4">
        {tasks.length === 0 ? (
          <p className="font-mono text-xs text-neutral-400">No tasks.</p>
        ) : days ? (
          <div className="space-y-4">
            {days.map(([date, dayTasks]) => (
              <div key={date} className="space-y-3">
                <p className="tnum font-mono text-[11px] tracking-wider text-neutral-500 uppercase">{date}</p>
                {dayTasks.map(card)}
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">{tasks.map(card)}</div>
        )}
      </div>
    </div>
  )
}
