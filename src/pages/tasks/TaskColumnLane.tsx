import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { TaskCard } from './TaskCard.tsx'
import { groupByDay } from '../../lib/tasks.ts'
import { TextInput } from '../../components/ui.tsx'
import type { Task, TaskColumn } from '../../types.ts'

/**
 * One column's lane. When `dayGrouped` is true (the "This week" scope),
 * cards are sub-headed by their date; Backlog scope renders them flat since
 * every card there has no date to group by.
 */
export function TaskColumnLane({
  column,
  tasks,
  dayGrouped,
  onOpenTask,
  onRename,
}: {
  column: TaskColumn
  tasks: Task[]
  dayGrouped: boolean
  onOpenTask: (task: Task) => void
  onRename: (name: string) => void
}) {
  const [renaming, setRenaming] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const { setNodeRef, isOver } = useDroppable({ id: column.id })

  const days = dayGrouped ? [...groupByDay(tasks).entries()].sort(([a], [b]) => a.localeCompare(b)) : null

  const startRename = () => {
    setNameDraft(column.name)
    setRenaming(true)
  }

  const saveRename = () => {
    setRenaming(false)
    const trimmed = nameDraft.trim()
    if (trimmed && trimmed !== column.name) {
      onRename(trimmed)
    }
  }

  const card = (task: Task) => <TaskCard key={task.id} task={task} onClick={() => onOpenTask(task)} />

  return (
    <div
      ref={setNodeRef}
      className={`flex w-64 shrink-0 flex-col gap-3 rounded-xl bg-paper pb-3 ${isOver ? 'ring-2 ring-brand/40' : ''}`}
    >
      <div
        className={`flex items-center justify-between gap-2 rounded-t-xl border-b-2 px-3 pt-3 pb-2.5 ${
          column.is_done ? 'border-settled/50' : 'border-edge'
        }`}
      >
        <div className="flex min-w-0 items-center gap-1.5">
          {column.is_done && (
            <span className="text-settled" aria-hidden>
              ✓
            </span>
          )}
          {renaming ? (
            <TextInput
              autoFocus
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={saveRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur()
                if (e.key === 'Escape') setRenaming(false)
              }}
              className="!w-auto text-sm font-semibold tracking-tight text-ink"
            />
          ) : (
            <h3
              className="cursor-text truncate text-sm font-semibold tracking-tight text-ink hover:underline"
              onClick={startRename}
            >
              {column.name}
            </h3>
          )}
        </div>
        <span className="tnum shrink-0 font-mono text-xs text-ink-faint">{tasks.length}</span>
      </div>

      {tasks.length === 0 ? (
        <p className="px-3 text-xs text-ink-faint">No tasks.</p>
      ) : days ? (
        <div className="space-y-3 px-3">
          {days.map(([date, dayTasks]) => (
            <div key={date} className="space-y-2">
              <p className="text-xs font-semibold tracking-wide text-ink-faint uppercase">{date}</p>
              {dayTasks.map(card)}
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2 px-3">{tasks.map(card)}</div>
      )}
    </div>
  )
}
