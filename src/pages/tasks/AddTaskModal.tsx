import type { FormEvent } from 'react'
import { useFinanceMutations } from '../../hooks/useFinanceMutations.ts'
import { useTaskForm } from '../../hooks/useTaskForm.ts'
import { referenceable } from '../../lib/tempId.ts'
import {
  BrutalModal,
  BrutalField,
  BrutalInput,
  BrutalSelect,
  BrutalButton,
  BrutalSecondaryButton,
} from '../../components/brutal.tsx'
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
 * `initialDate`/`initialColumnId` are silent pass-throughs, not form
 * fields — there's no visible date or column control here. The Dashboard
 * calendar's "add a task on this day" gesture (MonthCalendar.tsx) supplies
 * `initialDate` alone; a board column's own "+" (Tasks.tsx) supplies both,
 * so the task actually lands in that column, on the board, instead of
 * silently landing in the Backlog where it would look like nothing happened.
 */
export function AddTaskModal({
  open,
  data,
  initialDate,
  initialColumnId,
  onClose,
}: {
  open: boolean
  data: FinanceData
  initialDate?: string
  initialColumnId?: number
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
    addTask.mutate({
      ...form.values,
      date: initialDate,
      column_id: initialColumnId ?? firstColumn(data.task_columns).id,
    })
  }

  return (
    <BrutalModal open={open} title="Add task" onClose={onClose}>
      <form onSubmit={submit} className="space-y-5 p-6">
        <BrutalField label="Title" htmlFor="add-task-title" required>
          <BrutalInput
            id="add-task-title"
            required
            autoFocus
            value={form.title}
            onChange={(e) => form.setTitle(e.target.value)}
          />
        </BrutalField>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <BrutalField label="Repeats" htmlFor="add-task-repeats">
            <BrutalSelect
              id="add-task-repeats"
              value={form.recurrence}
              onChange={(e) => form.setRecurrence(e.target.value as TaskRecurrence | '')}
            >
              <option value="">Does not repeat</option>
              {RECURRENCES.map((r) => (
                <option key={r} value={r}>
                  {RECURRENCE_LABEL[r]}
                </option>
              ))}
            </BrutalSelect>
          </BrutalField>
          <BrutalField label="Part of a goal" htmlFor="add-task-goal">
            <BrutalSelect
              id="add-task-goal"
              value={form.goalId}
              onChange={(e) => form.setGoalId(e.target.value ? Number(e.target.value) : '')}
            >
              <option value="">Nothing</option>
              {goals.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title}
                </option>
              ))}
            </BrutalSelect>
          </BrutalField>
        </div>

        <div className="flex items-center gap-3 border-t-2 border-black pt-4">
          <BrutalSecondaryButton type="button" onClick={onClose}>
            Cancel
          </BrutalSecondaryButton>
          <BrutalButton type="submit" disabled={form.values === null}>
            Add task
          </BrutalButton>
        </div>
      </form>
    </BrutalModal>
  )
}
