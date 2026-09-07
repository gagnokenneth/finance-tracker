import { TaskCard } from './TaskCard.tsx'
import { groupByDay } from '../../lib/tasks.ts'
import type { Task, TaskColumn } from '../../types.ts'

/**
 * One column's lane. When `dayGrouped` is true (the "This week" scope),
 * cards are sub-headed by their date; Backlog scope renders them flat since
 * every card there has no date to group by.
 */
export function TaskColumnLane({
  column,
  tasks,
  columns,
  dayGrouped,
  onMove,
  onOpenTask,
}: {
  column: TaskColumn
  tasks: Task[]
  columns: TaskColumn[]
  dayGrouped: boolean
  onMove: (taskId: number, columnId: number) => void
  onOpenTask: (task: Task) => void
}) {
  const days = dayGrouped ? [...groupByDay(tasks).entries()].sort(([a], [b]) => a.localeCompare(b)) : null

  const card = (task: Task) => (
    <TaskCard
      key={task.id}
      task={task}
      columns={columns}
      onMove={(columnId) => onMove(task.id, columnId)}
      onClick={() => onOpenTask(task)}
    />
  )

  return (
    <div className="flex w-64 shrink-0 flex-col gap-2 rounded-xl bg-paper p-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-tight text-ink">{column.name}</h3>
        <span className="tnum font-mono text-xs text-ink-faint">{tasks.length}</span>
      </div>
      {tasks.length === 0 ? (
        <p className="text-xs text-ink-faint">No tasks.</p>
      ) : days ? (
        <div className="space-y-3">
          {days.map(([date, dayTasks]) => (
            <div key={date} className="space-y-2">
              <p className="text-xs font-semibold tracking-wide text-ink-faint uppercase">{date}</p>
              {dayTasks.map(card)}
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">{tasks.map(card)}</div>
      )}
    </div>
  )
}
