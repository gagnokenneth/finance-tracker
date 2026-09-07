import { useState } from 'react'
import { TaskCard } from './TaskCard.tsx'
import { groupByDay } from '../../lib/tasks.ts'
import { TextInput, RowButton, DeleteRowButton } from '../../components/ui.tsx'
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
  onRename,
  onDelete,
  onMoveLeft,
  onMoveRight,
  canDelete,
}: {
  column: TaskColumn
  tasks: Task[]
  columns: TaskColumn[]
  dayGrouped: boolean
  onMove: (taskId: number, columnId: number) => void
  onOpenTask: (task: Task) => void
  onRename: (name: string) => void
  onDelete: () => void
  onMoveLeft?: () => void
  onMoveRight?: () => void
  canDelete: boolean
}) {
  const [renaming, setRenaming] = useState(false)
  const [nameDraft, setNameDraft] = useState('')

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
      <div className="flex items-center justify-between gap-2">
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
            className="cursor-text text-sm font-semibold tracking-tight text-ink hover:underline"
            onClick={startRename}
          >
            {column.name}
          </h3>
        )}
        <span className="tnum shrink-0 font-mono text-xs text-ink-faint">{tasks.length}</span>
      </div>

      <div className="flex items-center gap-1.5">
        <RowButton type="button" title="Move left" aria-label="Move left" disabled={!onMoveLeft} onClick={onMoveLeft}>
          ←
        </RowButton>
        <RowButton
          type="button"
          title="Move right"
          aria-label="Move right"
          disabled={!onMoveRight}
          onClick={onMoveRight}
        >
          →
        </RowButton>
        <DeleteRowButton
          type="button"
          disabled={!canDelete}
          title={
            canDelete
              ? 'Delete'
              : column.is_done
                ? "The Done column can't be deleted"
                : "Move or delete this column's tasks first"
          }
          onClick={onDelete}
        />
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
