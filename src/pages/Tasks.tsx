import { useState } from 'react'
import { useFinanceData } from '../hooks/useFinanceData.ts'
import { useFinanceMutations } from '../hooks/useFinanceMutations.ts'
import { nextTaskDate, backlogTasks, tasksInWeek, groupByColumn } from '../lib/tasks.ts'
import { sortedColumns, doneColumn } from '../lib/taskColumns.ts'
import { isoDate, startOfWeek, addWeeks, weekWindow } from '../lib/currentMonth.ts'
import { ConfirmDialog } from '../components/ConfirmDialog.tsx'
import { EmptyState } from '../components/EmptyState.tsx'
import { Button, RowButton, SecondaryButton } from '../components/ui.tsx'
import { LoadError } from '../components/LoadError.tsx'
import { LoadingScreen } from '../components/LoadingScreen.tsx'
import { AddTaskModal } from './tasks/AddTaskModal.tsx'
import { TaskColumnLane } from './tasks/TaskColumnLane.tsx'
import type { Task } from '../types.ts'

type Scope = 'backlog' | 'week'

export function Tasks() {
  const { data, isPending, isError, error } = useFinanceData()
  const { moveTask, deleteTask } = useFinanceMutations()
  const [adding, setAdding] = useState(false)
  const [deleting, setDeleting] = useState<Task | null>(null)
  const [scope, setScope] = useState<Scope>('week')
  const [weekStart, setWeekStart] = useState(() => startOfWeek(isoDate()))

  if (isPending) return <LoadingScreen />
  if (isError || !data) return <LoadError error={error} />

  const columns = sortedColumns(data.task_columns)
  const done = doneColumn(data.task_columns)

  const scoped = scope === 'backlog' ? backlogTasks(data.tasks) : tasksInWeek(data.tasks, weekStart)
  const grouped = groupByColumn(scoped, columns)

  const move = (taskId: number, columnId: number) => {
    const task = data.tasks.find((t) => t.id === taskId)
    if (!task) return
    if (columnId === done.id) {
      moveTask.mutate({
        id: taskId,
        input: {
          column_id: columnId,
          completed_date: isoDate(),
          next_date: task.recurrence && task.date ? nextTaskDate(task.date, task.recurrence) : undefined,
        },
      })
    } else {
      moveTask.mutate({ id: taskId, input: { column_id: columnId } })
    }
  }

  // Task 4 replaces this with the real detail popup; for now clicking a
  // card does nothing extra beyond what its own Move control already offers.
  const openTask = () => {}

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
        <div className="flex gap-3 overflow-x-auto pb-2">
          {columns.map((column) => (
            <TaskColumnLane
              key={column.id}
              column={column}
              tasks={grouped.get(column.id) ?? []}
              columns={columns}
              dayGrouped={scope === 'week'}
              onMove={move}
              onOpenTask={openTask}
            />
          ))}
        </div>
      )}

      {adding && <AddTaskModal open data={data} onClose={() => setAdding(false)} initialDate={scope === 'week' ? weekStart : undefined} />}

      <ConfirmDialog
        open={deleting !== null}
        title="Delete task"
        message={deleting ? `Delete "${deleting.title}"? This cannot be undone.` : ''}
        confirmLabel="Delete task"
        onConfirm={() => {
          if (deleting) deleteTask.mutate(deleting.id)
          setDeleting(null)
        }}
        onClose={() => setDeleting(null)}
      />
    </div>
  )
}
