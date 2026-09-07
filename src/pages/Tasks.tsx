import { useState } from 'react'
import { DndContext } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { useFinanceData } from '../hooks/useFinanceData.ts'
import { useFinanceMutations } from '../hooks/useFinanceMutations.ts'
import { backlogTasks, tasksInWeek, groupByColumn, buildMoveInput } from '../lib/tasks.ts'
import { sortedColumns, doneColumn } from '../lib/taskColumns.ts'
import { isoDate, startOfWeek, addWeeks, weekWindow } from '../lib/currentMonth.ts'
import { EmptyState } from '../components/EmptyState.tsx'
import { Button, RowButton, SecondaryButton } from '../components/ui.tsx'
import { LoadError } from '../components/LoadError.tsx'
import { LoadingScreen } from '../components/LoadingScreen.tsx'
import { AddTaskModal } from './tasks/AddTaskModal.tsx'
import { TaskDetailModal } from './tasks/TaskDetailModal.tsx'
import { TaskColumnLane } from './tasks/TaskColumnLane.tsx'
import { AddColumnForm } from './tasks/AddColumnForm.tsx'
import type { Task, TaskColumn } from '../types.ts'

type Scope = 'backlog' | 'week'

export function Tasks() {
  const { data, isPending, isError, error } = useFinanceData()
  const { updateTaskColumn, deleteTaskColumn, moveTask } = useFinanceMutations()
  const [adding, setAdding] = useState(false)
  const [opened, setOpened] = useState<Task | null>(null)
  const [scope, setScope] = useState<Scope>('week')
  const [weekStart, setWeekStart] = useState(() => startOfWeek(isoDate()))

  if (isPending) return <LoadingScreen />
  if (isError || !data) return <LoadError error={error} />

  const columns = sortedColumns(data.task_columns)
  const done = doneColumn(data.task_columns)

  const scoped = scope === 'backlog' ? backlogTasks(data.tasks) : tasksInWeek(data.tasks, weekStart)
  const grouped = groupByColumn(scoped, columns)
  // Columns with at least one task, across ALL of the user's tasks (not just
  // the current Backlog/week scope) — a column is only safe to delete when
  // no task anywhere points at it. One O(tasks) pass instead of an O(tasks)
  // .some() scan repeated per column.
  const columnsWithTasks = new Set(data.tasks.map((t) => t.column_id))

  const swap = (a: TaskColumn, b: TaskColumn) => {
    updateTaskColumn.mutate({ id: a.id, patch: { sort_order: b.sort_order } })
    updateTaskColumn.mutate({ id: b.id, patch: { sort_order: a.sort_order } })
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return
    const taskId = Number(active.id)
    const columnId = Number(over.id)
    const task = data.tasks.find((t) => t.id === taskId)
    if (!task || task.column_id === columnId) return
    moveTask.mutate({ id: taskId, input: buildMoveInput(task, columnId, done.id) })
  }

  const { start, end } = weekWindow(weekStart)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Tasks</h1>
        <Button type="button" onClick={() => setAdding(true)}>
          Add task
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <RowButton tone={scope === 'backlog' ? 'primary' : 'neutral'} onClick={() => setScope('backlog')}>
            Backlog
          </RowButton>
          <RowButton tone={scope === 'week' ? 'primary' : 'neutral'} onClick={() => setScope('week')}>
            This week
          </RowButton>
        </div>
        {scope === 'week' && (
          <div className="flex items-center gap-2">
            <SecondaryButton type="button" onClick={() => setWeekStart((w) => addWeeks(w, -1))}>
              ← Prev
            </SecondaryButton>
            <span className="tnum font-mono text-sm text-ink-soft">
              {start} – {end}
            </span>
            <SecondaryButton type="button" onClick={() => setWeekStart((w) => addWeeks(w, 1))}>
              Next →
            </SecondaryButton>
          </div>
        )}
      </div>

      {data.tasks.length === 0 ? (
        <EmptyState title="Nothing tracked yet">
          Add a one-off errand, or something you want to repeat.
        </EmptyState>
      ) : (
        <DndContext onDragEnd={handleDragEnd}>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {columns.map((column, i) => (
              <TaskColumnLane
                key={column.id}
                column={column}
                tasks={grouped.get(column.id) ?? []}
                dayGrouped={scope === 'week'}
                onOpenTask={setOpened}
                onRename={(name) => updateTaskColumn.mutate({ id: column.id, patch: { name } })}
                onDelete={() => deleteTaskColumn.mutate(column.id)}
                canDelete={!column.is_done && !columnsWithTasks.has(column.id)}
                onMoveLeft={i > 0 ? () => swap(column, columns[i - 1]) : undefined}
                onMoveRight={i < columns.length - 1 ? () => swap(column, columns[i + 1]) : undefined}
              />
            ))}
            <AddColumnForm />
          </div>
        </DndContext>
      )}

      {adding && <AddTaskModal open data={data} onClose={() => setAdding(false)} initialDate={scope === 'week' ? weekStart : undefined} />}

      {opened && <TaskDetailModal open task={opened} data={data} onClose={() => setOpened(null)} />}
    </div>
  )
}
