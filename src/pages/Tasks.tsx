import { useState } from 'react'
import { useFinanceData } from '../hooks/useFinanceData.ts'
import { useFinanceMutations } from '../hooks/useFinanceMutations.ts'
import { tasksSorted, nextTaskDate } from '../lib/tasks.ts'
import { isoDate } from '../lib/currentMonth.ts'
import { isTemp } from '../lib/tempId.ts'
import { PendingBadge } from '../components/PendingBadge.tsx'
import { ConfirmDialog } from '../components/ConfirmDialog.tsx'
import { EmptyState } from '../components/EmptyState.tsx'
import { Button, RowButton, EditRowButton, DeleteRowButton } from '../components/ui.tsx'
import { LoadError } from '../components/LoadError.tsx'
import { LoadingScreen } from '../components/LoadingScreen.tsx'
import { AddTaskModal } from './tasks/AddTaskModal.tsx'
import { EditTaskModal } from './tasks/EditTaskModal.tsx'
import { doneColumn, firstColumn } from '../lib/taskColumns.ts'
import type { Task } from '../types.ts'

// Tasks has no detail route, so a row is never a link — unlike CardRow (which
// exists for the other modules' "card links to its detail page" rows), this
// reuses only its shell classes on a plain div. A CardRow with to="#" would
// still render as a real, focusable, hover-lifted anchor for every completed
// or non-pending open row, implying a destination that does not exist and
// leaving `#` clickable as a dead link. A row here is either the target of
// its own inline buttons or, for a completed task, not interactive at all.
const ROW = 'block rounded-xl border border-edge bg-white p-5'

export function Tasks() {
  const { data, isPending, isError, error } = useFinanceData()
  const { moveTask, deleteTask } = useFinanceMutations()
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<Task | null>(null)
  const [deleting, setDeleting] = useState<Task | null>(null)

  if (isPending) return <LoadingScreen />
  if (isError || !data) return <LoadError error={error} />

  const doneColId = doneColumn(data.task_columns).id
  const open = tasksSorted(data.tasks.filter((t) => t.column_id !== doneColId))
  // Most-recently-completed first — tasksSorted's date is the task's
  // originally *scheduled* day, which for a completed task no longer means
  // anything; completed_date is what actually orders "done".
  const done = data.tasks
    .filter((t) => t.column_id === doneColId)
    .sort((a, b) => (b.completed_date ?? '').localeCompare(a.completed_date ?? ''))

  const complete = (task: Task) => {
    const today = isoDate()
    moveTask.mutate({
      id: task.id,
      input: {
        column_id: doneColId,
        completed_date: today,
        next_date: task.recurrence && task.date ? nextTaskDate(task.date, task.recurrence) : undefined,
      },
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Tasks</h1>
          {open.length > 0 && (
            <p className="mt-1 text-sm text-ink-soft">
              <span className="tnum font-mono">{open.length}</span>{' '}
              {open.length === 1 ? 'task' : 'tasks'} open
            </p>
          )}
        </div>
        <Button type="button" onClick={() => setAdding(true)}>
          Add task
        </Button>
      </div>

      {open.length === 0 && done.length === 0 ? (
        <EmptyState title="Nothing tracked yet">
          Add a one-off errand, or something you want to repeat.
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {open.map((task) => {
            const pending = isTemp(task.id)
            return (
              <div key={task.id} className={ROW}>
                <div className="flex items-start justify-between gap-4">
                  <span className="font-semibold tracking-tight text-ink">{task.title}</span>
                  <span className="tnum font-mono text-sm text-ink-soft">{task.date}</span>
                </div>
                {task.notes && <p className="mt-1 text-sm text-ink-soft">{task.notes}</p>}
                <div className="mt-4 flex items-center gap-2">
                  {pending ? (
                    <PendingBadge />
                  ) : (
                    <>
                      <RowButton tone="primary" onClick={() => complete(task)}>
                        Complete
                      </RowButton>
                      <EditRowButton onClick={() => setEditing(task)} />
                      <DeleteRowButton onClick={() => setDeleting(task)} />
                    </>
                  )}
                </div>
              </div>
            )
          })}
          {done.map((task) => {
            const pending = isTemp(task.id)
            return (
              <div key={task.id} className={ROW}>
                <div className="flex items-start justify-between gap-4">
                  <span className="font-medium text-ink-soft line-through">{task.title}</span>
                  <span className="tnum font-mono text-sm text-ink-faint">{task.completed_date}</span>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  {pending ? (
                    <PendingBadge />
                  ) : (
                    <>
                      <RowButton
                        onClick={() =>
                          moveTask.mutate({
                            id: task.id,
                            input: { column_id: firstColumn(data.task_columns).id },
                          })
                        }
                      >
                        Undo
                      </RowButton>
                      <DeleteRowButton onClick={() => setDeleting(task)} />
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {adding && <AddTaskModal open data={data} onClose={() => setAdding(false)} />}
      {editing && (
        <EditTaskModal open task={editing} data={data} onClose={() => setEditing(null)} />
      )}

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
