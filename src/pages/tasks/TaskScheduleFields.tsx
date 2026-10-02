import { BrutalField, BrutalSelect } from '../../components/brutal.tsx'
import { RECURRENCES, RECURRENCE_LABEL } from '../../lib/tasks.ts'
import type { useTaskForm } from '../../hooks/useTaskForm.ts'
import type { Goal } from '../../types.ts'

/** The Repeats / Part of a goal pair both task modals share. `idPrefix`
 *  keeps the label-to-select ids unique between the two. */
export function TaskScheduleFields({
  form,
  goals,
  idPrefix,
}: {
  form: ReturnType<typeof useTaskForm>
  goals: Goal[]
  idPrefix: string
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <BrutalField label="Repeats" htmlFor={`${idPrefix}-repeats`}>
        <BrutalSelect
          id={`${idPrefix}-repeats`}
          value={form.recurrence}
          onChange={(e) => form.setRecurrence(e.target.value as typeof form.recurrence)}
        >
          <option value="">Does not repeat</option>
          {RECURRENCES.map((r) => (
            <option key={r} value={r}>
              {RECURRENCE_LABEL[r]}
            </option>
          ))}
        </BrutalSelect>
      </BrutalField>
      <BrutalField label="Part of a goal" htmlFor={`${idPrefix}-goal`}>
        <BrutalSelect
          id={`${idPrefix}-goal`}
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
  )
}
