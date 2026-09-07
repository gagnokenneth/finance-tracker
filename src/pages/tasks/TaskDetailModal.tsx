import { useState } from 'react'
import type { FormEvent } from 'react'
import { useFinanceMutations } from '../../hooks/useFinanceMutations.ts'
import { useTaskForm } from '../../hooks/useTaskForm.ts'
import { referenceable } from '../../lib/tempId.ts'
import { buildMoveInput, RECURRENCES, RECURRENCE_LABEL } from '../../lib/tasks.ts'
import { sortedColumns, doneColumn } from '../../lib/taskColumns.ts'
import { Modal } from '../../components/Modal.tsx'
import { ConfirmDialog } from '../../components/ConfirmDialog.tsx'
import { RichTextEditor } from '../../components/RichTextEditor.tsx'
import { Field, TextInput, SelectInput, Button, SecondaryButton, RowButton, DeleteButton } from '../../components/ui.tsx'
import type { FinanceData, Task } from '../../types.ts'

/** `created_at` is a full ISO 8601 datetime (see Task's own doc comment) —
 *  formatted in the viewer's own locale/timezone, not the raw ISO string. */
function formatCreatedAt(createdAt: string | undefined): string {
  if (!createdAt) return '—'
  const date = new Date(createdAt)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export function TaskDetailModal({
  open,
  task,
  data,
  onClose,
}: {
  open: boolean
  task: Task
  data: FinanceData
  onClose: () => void
}) {
  const { updateTask, moveTask, deleteTask } = useFinanceMutations()
  const form = useTaskForm(task)
  const [deleting, setDeleting] = useState(false)
  const goals = referenceable(data.goals.filter((g) => g.status === 'planned' || g.status === 'active' || g.id === task.goal_id))
  const columns = sortedColumns(data.task_columns)
  const done = doneColumn(data.task_columns)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!form.values) return
    updateTask.mutate({
      id: task.id,
      patch: {
        title: form.values.title,
        notes: form.values.notes ?? null,
        recurrence: form.values.recurrence ?? null,
        goal_id: form.values.goal_id ?? null,
      },
    })
    onClose()
  }

  const move = (columnId: number) => {
    moveTask.mutate({ id: task.id, input: buildMoveInput(task, columnId, done.id) })
    onClose()
  }

  return (
    <Modal open={open} title={task.title} onClose={onClose} wide>
      <div className="flex flex-wrap items-center gap-1.5">
        {columns
          .filter((c) => c.id !== task.column_id)
          .map((c) => (
            <RowButton key={c.id} tone={c.is_done ? 'primary' : 'neutral'} onClick={() => move(c.id)}>
              Move to {c.name}
            </RowButton>
          ))}
      </div>

      <p className="mt-2 text-xs text-ink-faint">Created {formatCreatedAt(task.created_at)}</p>

      <form onSubmit={submit} className="mt-3 flex flex-col gap-3">
        <Field label="Title" required>
          <TextInput required value={form.title} onChange={(e) => form.setTitle(e.target.value)} />
        </Field>
        <Field label="Description">
          <RichTextEditor value={form.notes} onChange={form.setNotes} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Repeats">
            <SelectInput value={form.recurrence} onChange={(e) => form.setRecurrence(e.target.value as typeof form.recurrence)}>
              <option value="">Does not repeat</option>
              {RECURRENCES.map((r) => (
                <option key={r} value={r}>
                  {RECURRENCE_LABEL[r]}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Part of a goal">
            <SelectInput value={form.goalId} onChange={(e) => form.setGoalId(e.target.value ? Number(e.target.value) : '')}>
              <option value="">Nothing</option>
              {goals.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title}
                </option>
              ))}
            </SelectInput>
          </Field>
        </div>

        <div className="mt-1 flex justify-between gap-2">
          <DeleteButton type="button" onClick={() => setDeleting(true)} />
          <div className="flex gap-2">
            <SecondaryButton type="button" onClick={onClose}>
              Cancel
            </SecondaryButton>
            <Button type="submit" disabled={form.values === null}>
              Save
            </Button>
          </div>
        </div>
      </form>

      <ConfirmDialog
        open={deleting}
        title="Delete task"
        message={`Delete "${task.title}"? This cannot be undone.`}
        confirmLabel="Delete task"
        onConfirm={() => {
          setDeleting(false)
          onClose()
          deleteTask.mutate(task.id)
        }}
        onClose={() => setDeleting(false)}
      />
    </Modal>
  )
}
