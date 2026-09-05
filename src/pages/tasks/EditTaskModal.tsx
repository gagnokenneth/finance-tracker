import type { FormEvent } from 'react'
import { useFinanceMutations } from '../../hooks/useFinanceMutations.ts'
import { useTaskForm } from '../../hooks/useTaskForm.ts'
import { Modal } from '../../components/Modal.tsx'
import { Field, TextInput, SelectInput, Button, SecondaryButton } from '../../components/ui.tsx'
import { RECURRENCES, RECURRENCE_LABEL } from '../../lib/tasks.ts'
import type { Task, TaskRecurrence } from '../../types.ts'

export function EditTaskModal({
  open,
  task,
  onClose,
}: {
  open: boolean
  task: Task
  onClose: () => void
}) {
  const { updateTask } = useFinanceMutations()
  const form = useTaskForm(task)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!form.values) return
    onClose()
    // null clears an optional field on the wire — undefined would be dropped
    // by JSON.stringify and the backend would keep the old value. See
    // TaskPatch in FinanceApi.ts.
    updateTask.mutate({
      id: task.id,
      patch: {
        title: form.values.title,
        notes: form.values.notes ?? null,
        date: form.values.date,
        start_time: form.values.start_time ?? null,
        end_time: form.values.end_time ?? null,
        recurrence: form.values.recurrence ?? null,
      },
    })
  }

  return (
    <Modal open={open} title="Edit task" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <Field label="Title">
          <TextInput required value={form.title} onChange={(e) => form.setTitle(e.target.value)} />
        </Field>
        <Field label="Date">
          <TextInput
            required
            type="date"
            value={form.date}
            onChange={(e) => form.setDate(e.target.value)}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start time">
            <TextInput
              type="time"
              value={form.startTime}
              onChange={(e) => form.setStartTime(e.target.value)}
            />
          </Field>
          <Field label="End time">
            <TextInput
              type="time"
              value={form.endTime}
              onChange={(e) => form.setEndTime(e.target.value)}
            />
          </Field>
        </div>
        <Field label="Repeats">
          <SelectInput
            value={form.recurrence}
            onChange={(e) => form.setRecurrence(e.target.value as TaskRecurrence | '')}
          >
            <option value="">Does not repeat</option>
            {RECURRENCES.map((r) => (
              <option key={r} value={r}>
                {RECURRENCE_LABEL[r]}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Notes">
          <TextInput value={form.notes} onChange={(e) => form.setNotes(e.target.value)} />
        </Field>

        <div className="mt-1 flex justify-end gap-2">
          <SecondaryButton type="button" onClick={onClose}>
            Cancel
          </SecondaryButton>
          <Button type="submit" disabled={form.values === null}>
            Save
          </Button>
        </div>
      </form>
    </Modal>
  )
}
