import type { FormEvent } from 'react'
import { useFinanceMutations } from '../../hooks/useFinanceMutations.ts'
import { useTaskForm } from '../../hooks/useTaskForm.ts'
import { referenceable } from '../../lib/tempId.ts'
import { Modal } from '../../components/Modal.tsx'
import { Field, TextInput, SelectInput, Button, SecondaryButton } from '../../components/ui.tsx'
import { RECURRENCES, RECURRENCE_LABEL } from '../../lib/tasks.ts'
import { firstColumn } from '../../lib/taskColumns.ts'
import type { FinanceData, TaskRecurrence } from '../../types.ts'

/**
 * `initialDate` lets the Calendar page open this pre-filled to the clicked
 * day. `data` is passed down from the parent page rather than fetched here
 * — no modal in this app calls useFinanceData() itself.
 */
export function AddTaskModal({
  open,
  data,
  initialDate,
  onClose,
}: {
  open: boolean
  data: FinanceData
  initialDate?: string
  onClose: () => void
}) {
  const { addTask } = useFinanceMutations()
  const form = useTaskForm(undefined, initialDate)
  const goals = referenceable(
    data.goals.filter((g) => g.status === 'planned' || g.status === 'active'),
  )

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!form.values) return
    onClose()
    addTask.mutate({ ...form.values, column_id: firstColumn(data.task_columns).id })
  }

  return (
    <Modal open={open} title="Add task" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <Field label="Title" required>
          <TextInput required value={form.title} onChange={(e) => form.setTitle(e.target.value)} />
        </Field>
        <Field label="Date">
          <TextInput
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
        <Field label="Part of a goal">
          <SelectInput
            value={form.goalId}
            onChange={(e) => form.setGoalId(e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">Nothing</option>
            {goals.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title}
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
