import type { FormEvent } from 'react'
import { useFinanceMutations } from '../../hooks/useFinanceMutations.ts'
import { useTaskForm } from '../../hooks/useTaskForm.ts'
import { Modal } from '../../components/Modal.tsx'
import { Field, TextInput, SelectInput, Button, SecondaryButton } from '../../components/ui.tsx'
import { RECURRENCES, RECURRENCE_LABEL } from '../../lib/tasks.ts'
import type { TaskRecurrence } from '../../types.ts'

/** `initialDate` lets the Calendar page open this pre-filled to the clicked day. */
export function AddTaskModal({
  open,
  initialDate,
  onClose,
}: {
  open: boolean
  initialDate?: string
  onClose: () => void
}) {
  const { addTask } = useFinanceMutations()
  const form = useTaskForm(undefined, initialDate)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!form.values) return
    onClose()
    addTask.mutate(form.values)
  }

  return (
    <Modal open={open} title="Add task" onClose={onClose}>
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
            Add task
          </Button>
        </div>
      </form>
    </Modal>
  )
}
