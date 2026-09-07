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
 * `data` is passed down from the parent page rather than fetched here — no
 * modal in this app calls useFinanceData() itself.
 *
 * Creation is deliberately minimal — no date field (every new task started
 * from the Tasks page lands in the Backlog; it gets a date by being dragged
 * onto the board) and no description (written afterward via the detail
 * popup's WYSIWYG editor, matching how Notes' own creation flow defers rich
 * content to after the row exists).
 *
 * `initialDate` is the one exception: the Dashboard calendar's "add a task
 * on this day" gesture (MonthCalendar.tsx) still creates a task dated to
 * the day that was clicked. There's no visible date control for it — it's
 * a silent pass-through from that specific entry point, not a form field a
 * user fills in.
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
  const form = useTaskForm()
  const goals = referenceable(
    data.goals.filter((g) => g.status === 'planned' || g.status === 'active'),
  )

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!form.values) return
    onClose()
    addTask.mutate({ ...form.values, date: initialDate, column_id: firstColumn(data.task_columns).id })
  }

  return (
    <Modal open={open} title="Add task" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <Field label="Title" required>
          <TextInput required value={form.title} onChange={(e) => form.setTitle(e.target.value)} />
        </Field>
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
