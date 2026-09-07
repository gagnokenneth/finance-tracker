import { useState } from 'react'
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
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
import { BacklogTaskRow } from './tasks/BacklogTaskRow.tsx'
import type { Task } from '../types.ts'

export function Tasks() {
  const { data, isPending, isError, error } = useFinanceData()
  const { updateTaskColumn, moveTask } = useFinanceMutations()
  const [adding, setAdding] = useState(false)
  const [opened, setOpened] = useState<Task | null>(null)
  const [weekStart, setWeekStart] = useState(() => startOfWeek(isoDate()))
  // A plain click has to survive being on top of a draggable — without a
  // distance threshold, dnd-kit "activates" (and swallows the click) on the
  // very first pixel of pointer movement under the default PointerSensor.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  if (isPending) return <LoadingScreen />
  if (isError || !data) return <LoadError error={error} />

  const columns = sortedColumns(data.task_columns)
  const done = doneColumn(data.task_columns)

  const weekTasks = tasksInWeek(data.tasks, weekStart)
  const grouped = groupByColumn(weekTasks, columns)
  const backlog = backlogTasks(data.tasks)

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return
    const taskId = Number(active.id)
    const columnId = Number(over.id)
    const task = data.tasks.find((t) => t.id === taskId)
    if (!task) return
    // An undated (Backlog) task carries no date to place it in a week — the
    // currently-viewed week is what the drop is standing in for, so that's
    // what it gets. A task already on the board keeps its own date.
    const dateOverride = task.date === undefined ? weekStart : undefined
    if (task.column_id === columnId && dateOverride === undefined) return
    moveTask.mutate({ id: taskId, input: buildMoveInput(task, columnId, done.id, dateOverride) })
  }

  const { start, end } = weekWindow(weekStart)

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Tasks</h1>
        <Button type="button" onClick={() => setAdding(true)}>
          Add task
        </Button>
      </div>

      {data.tasks.length === 0 ? (
        <EmptyState title="Nothing tracked yet">
          Add a one-off errand, or something you want to repeat.
        </EmptyState>
      ) : (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="space-y-3">
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

            <div className="overflow-x-auto rounded-2xl border border-edge bg-white p-3">
              <div className="flex gap-3">
                {columns.map((column) => (
                  <TaskColumnLane
                    key={column.id}
                    column={column}
                    tasks={grouped.get(column.id) ?? []}
                    dayGrouped
                    onOpenTask={setOpened}
                    onRename={(name) => updateTaskColumn.mutate({ id: column.id, patch: { name } })}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-baseline gap-2">
                <h2 className="text-sm font-semibold tracking-wide text-ink-faint uppercase">Backlog</h2>
                <span className="tnum font-mono text-xs text-ink-faint">{backlog.length}</span>
              </div>
              <RowButton type="button" tone="primary" title="Add task" aria-label="Add task" onClick={() => setAdding(true)}>
                +
              </RowButton>
            </div>
            {backlog.length === 0 ? (
              <p className="text-sm text-ink-faint">No backlog tasks.</p>
            ) : (
              <div className="divide-y divide-edge overflow-hidden rounded-2xl border border-edge bg-white">
                {backlog.map((task) => (
                  <BacklogTaskRow
                    key={task.id}
                    task={task}
                    column={data.task_columns.find((c) => c.id === task.column_id)}
                    onClick={() => setOpened(task)}
                  />
                ))}
              </div>
            )}
          </div>
        </DndContext>
      )}

      {adding && <AddTaskModal open data={data} onClose={() => setAdding(false)} />}

      {opened && <TaskDetailModal open task={opened} data={data} onClose={() => setOpened(null)} />}
    </div>
  )
}
