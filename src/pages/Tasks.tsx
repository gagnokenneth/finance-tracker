import { useState } from 'react'
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { useFinanceData } from '../hooks/useFinanceData.ts'
import { useFinanceMutations } from '../hooks/useFinanceMutations.ts'
import { backlogTasks, tasksInWeek, groupByColumn, buildMoveInput } from '../lib/tasks.ts'
import { sortedColumns, doneColumn } from '../lib/taskColumns.ts'
import { isoDate, startOfWeek, addWeeks, weekWindow } from '../lib/currentMonth.ts'
import { isTemp } from '../lib/tempId.ts'
import { Pill } from '../components/StatusBadge.tsx'
import { PendingBadge } from '../components/PendingBadge.tsx'
import { EmptyState } from '../components/EmptyState.tsx'
import { Button, SecondaryButton } from '../components/ui.tsx'
import { LoadError } from '../components/LoadError.tsx'
import { LoadingScreen } from '../components/LoadingScreen.tsx'
import { AddTaskModal } from './tasks/AddTaskModal.tsx'
import { TaskDetailModal } from './tasks/TaskDetailModal.tsx'
import { TaskColumnLane } from './tasks/TaskColumnLane.tsx'
import { AddColumnForm } from './tasks/AddColumnForm.tsx'
import type { Task } from '../types.ts'

export function Tasks() {
  const { data, isPending, isError, error } = useFinanceData()
  const { updateTaskColumn, deleteTaskColumn, moveTask } = useFinanceMutations()
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
  // Columns with at least one task, across ALL of the user's tasks (not just
  // this week) — a column is only safe to delete when no task anywhere
  // points at it. One O(tasks) pass instead of an O(tasks) scan per column.
  const columnsWithTasks = new Set(data.tasks.map((t) => t.column_id))

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
        <>
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

            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {columns.map((column) => (
                  <TaskColumnLane
                    key={column.id}
                    column={column}
                    tasks={grouped.get(column.id) ?? []}
                    dayGrouped
                    onOpenTask={setOpened}
                    onRename={(name) => updateTaskColumn.mutate({ id: column.id, patch: { name } })}
                    onDelete={() => deleteTaskColumn.mutate(column.id)}
                    canDelete={!column.is_done && !columnsWithTasks.has(column.id)}
                  />
                ))}
                <AddColumnForm />
              </div>
            </DndContext>
          </div>

          <div className="space-y-3">
            <div className="flex items-baseline gap-2">
              <h2 className="text-sm font-semibold tracking-wide text-ink-faint uppercase">Backlog</h2>
              <span className="tnum font-mono text-xs text-ink-faint">{backlog.length}</span>
            </div>
            {backlog.length === 0 ? (
              <p className="text-sm text-ink-faint">No backlog tasks.</p>
            ) : (
              <div className="divide-y divide-edge overflow-hidden rounded-xl border border-edge bg-white">
                {backlog.map((task) => {
                  const column = data.task_columns.find((c) => c.id === task.column_id)
                  const pending = isTemp(task.id)
                  return (
                    <button
                      key={task.id}
                      type="button"
                      disabled={pending}
                      onClick={() => setOpened(task)}
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
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}

      {adding && <AddTaskModal open data={data} onClose={() => setAdding(false)} initialDate={weekStart} />}

      {opened && <TaskDetailModal open task={opened} data={data} onClose={() => setOpened(null)} />}
    </div>
  )
}
