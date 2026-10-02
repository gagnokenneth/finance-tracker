import { useState } from 'react'
import type { FormEvent } from 'react'
import { useFinanceMutations } from '../../hooks/useFinanceMutations.ts'
import { useTaskForm } from '../../hooks/useTaskForm.ts'
import { buildMoveInput } from '../../lib/tasks.ts'
import { sortedColumns, doneColumn } from '../../lib/taskColumns.ts'
import { RichTextEditor } from '../../components/RichTextEditor.tsx'
import { DeleteIcon } from '../../components/icons.tsx'
import {
  BrutalModal,
  BrutalConfirm,
  BrutalField,
  BrutalInput,
  BrutalButton,
  BrutalSecondaryButton,
  smallButtonClass,
  BrutalModalBody,
  BrutalModalFooter,
} from '../../components/brutal.tsx'
import { brutalEditorLook } from '../../components/brutalEditorLook.ts'
import { TaskRepeatsField } from './TaskRepeatsField.tsx'
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
  weekStart,
  onClose,
}: {
  open: boolean
  task: Task
  data: FinanceData
  /** The board's currently-viewed week — stands in for the date an undated
   *  (Backlog) task needs when moved via a button here, same as a drag drop. */
  weekStart: string
  onClose: () => void
}) {
  const { updateTask, moveTask, deleteTask } = useFinanceMutations()
  const form = useTaskForm(task)
  const [deleting, setDeleting] = useState(false)
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
      },
    })
    onClose()
  }

  const move = (columnId: number) => {
    // Same stand-in date as the board's drag-and-drop: an undated (Backlog)
    // task has no date of its own to keep, so the currently-viewed week fills
    // in for it.
    const dateOverride = task.date === undefined ? weekStart : undefined
    moveTask.mutate({ id: task.id, input: buildMoveInput(task, columnId, done.id, dateOverride) })
    onClose()
  }

  return (
    <BrutalModal open={open} title="Edit task" onClose={onClose} look="plain">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black bg-neutral-50 px-6 py-3.5">
        <div className="flex flex-wrap items-center gap-2">
          {columns
            .filter((c) => c.id !== task.column_id)
            .map((c) => (
              <button key={c.id} type="button" className={smallButtonClass} onClick={() => move(c.id)}>
                Move to {c.name}
              </button>
            ))}
        </div>
        <p className="font-mono text-[11px] text-neutral-500 uppercase">Created {formatCreatedAt(task.created_at)}</p>
      </div>

      <form onSubmit={submit}>
        <BrutalModalBody>
          <BrutalField label="Title" htmlFor="edit-task-title" required>
            <BrutalInput id="edit-task-title" required value={form.title} onChange={(e) => form.setTitle(e.target.value)} />
          </BrutalField>
          <BrutalField label="Description">
            <RichTextEditor look={brutalEditorLook} value={form.notes} onChange={form.setNotes} />
          </BrutalField>
          <TaskRepeatsField form={form} idPrefix="edit-task" />
        </BrutalModalBody>

        <BrutalModalFooter spread>
          <BrutalSecondaryButton type="button" onClick={() => setDeleting(true)}>
            <DeleteIcon />
            Delete
          </BrutalSecondaryButton>
          <div className="flex gap-3">
            <BrutalSecondaryButton type="button" onClick={onClose}>
              Cancel
            </BrutalSecondaryButton>
            <BrutalButton type="submit" disabled={form.values === null}>
              Save
            </BrutalButton>
          </div>
        </BrutalModalFooter>
      </form>

      <BrutalConfirm
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
    </BrutalModal>
  )
}
