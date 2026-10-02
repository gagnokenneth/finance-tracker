import { useState } from 'react'
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { useFinanceData } from '../hooks/useFinanceData.ts'
import { useFinanceMutations } from '../hooks/useFinanceMutations.ts'
import { backlogTasks, tasksInWeek, groupByColumn, buildMoveInput } from '../lib/tasks.ts'
import { sortedColumns, doneColumn } from '../lib/taskColumns.ts'
import { isoDate, startOfWeek, addWeeks, weekWindow } from '../lib/currentMonth.ts'
import { BrutalAddButton, invertOnHover, labelClass } from '../components/brutal.tsx'
import { LoadError } from '../components/LoadError.tsx'
import { LoadingScreen } from '../components/LoadingScreen.tsx'
import { AddTaskModal } from './tasks/AddTaskModal.tsx'
import { TaskDetailModal } from './tasks/TaskDetailModal.tsx'
import { TaskColumnLane } from './tasks/TaskColumnLane.tsx'
import { BacklogTaskRow } from './tasks/BacklogTaskRow.tsx'
import type { Task } from '../types.ts'

/** `'backlog'` opens the modal with no column/date override (lands in the
 *  first column, undated); a number opens it pre-targeted at that column,
 *  dated to the currently-viewed week so it actually shows up on the board. */
type AddTarget = 'backlog' | number

// A plain click has to survive being on top of a draggable — without a
// distance threshold, dnd-kit "activates" (and swallows the click) on the
// very first pixel of pointer movement under the default PointerSensor.
// Module-level, not inline in the component: useSensor/useSensors memoize
// on this object's identity, and a fresh literal every render would defeat
// that memoization on every single render of the page.
const POINTER_ACTIVATION = { activationConstraint: { distance: 8 } }

/** One segment of the week stepper; the middle (date range) segment shares
 *  its frame but drops the hover and keeps only top/bottom rules. */
const stepFrame = 'flex h-10 items-center border-black bg-white font-mono text-xs font-bold'
const stepButtonClass = `${stepFrame} gap-1.5 border px-4 tracking-wider uppercase ${invertOnHover}`

export function Tasks() {
  const { data, isPending, isError, error } = useFinanceData()
  const { updateTaskColumn, moveTask } = useFinanceMutations()
  const [addTarget, setAddTarget] = useState<AddTarget | null>(null)
  const [opened, setOpened] = useState<Task | null>(null)
  const [weekStart, setWeekStart] = useState(() => startOfWeek(isoDate()))
  const sensors = useSensors(useSensor(PointerSensor, POINTER_ACTIVATION))

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
  const targetColumnId = typeof addTarget === 'number' ? addTarget : undefined

  return (
    <div className="space-y-10">
      <h1 className="text-5xl font-bold tracking-tight text-black uppercase md:text-6xl">Tasks</h1>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="flex items-center">
          <button
            type="button"
            aria-label="Previous week"
            className={stepButtonClass}
            onClick={() => setWeekStart((w) => addWeeks(w, -1))}
          >
            ← Prev
          </button>
          <div className={`tnum ${stepFrame} justify-center border-y px-3 tracking-widest text-black sm:px-6`}>
            {start} – {end}
          </div>
          <button
            type="button"
            aria-label="Next week"
            className={stepButtonClass}
            onClick={() => setWeekStart((w) => addWeeks(w, 1))}
          >
            Next →
          </button>
        </div>

        {/* gap-px over a black ground draws the 1px rules between lanes. Lanes
            are user-defined, so their count isn't fixed: equal-width auto
            columns, scrolling sideways once there are too many to fit. */}
        <div className="overflow-x-auto">
          <div className="grid grid-cols-1 gap-px border border-black bg-black md:auto-cols-[minmax(16rem,1fr)] md:grid-flow-col md:grid-cols-none">
            {columns.map((column) => (
              <TaskColumnLane
                key={column.id}
                column={column}
                tasks={grouped.get(column.id) ?? []}
                dayGrouped
                onOpenTask={setOpened}
                onRename={(name) => updateTaskColumn.mutate({ id: column.id, patch: { name } })}
                onAddTask={column.is_done ? undefined : () => setAddTarget(column.id)}
              />
            ))}
          </div>
        </div>

        <section className="space-y-4 pt-6">
          <div className="flex items-center gap-3">
            <h2 className={labelClass}>Backlog</h2>
            <span className="tnum font-mono text-xs font-bold text-neutral-500">{backlog.length}</span>
            <BrutalAddButton aria-label="Add task to Backlog" className="size-5 text-xs" onClick={() => setAddTarget('backlog')} />
          </div>
          {backlog.length === 0 ? (
            <p className="font-mono text-xs text-neutral-400">No backlog tasks.</p>
          ) : (
            <div className="space-y-2">
              {backlog.map((task) => (
                <BacklogTaskRow key={task.id} task={task} onClick={() => setOpened(task)} />
              ))}
            </div>
          )}
        </section>
      </DndContext>

      {addTarget !== null && (
        <AddTaskModal
          open
          data={data}
          initialColumnId={targetColumnId}
          initialDate={targetColumnId !== undefined ? weekStart : undefined}
          onClose={() => setAddTarget(null)}
        />
      )}

      {opened && (
        <TaskDetailModal open task={opened} data={data} weekStart={weekStart} onClose={() => setOpened(null)} />
      )}
    </div>
  )
}
