import { BrutalField, BrutalSelect } from '../../components/brutal.tsx'
import { RECURRENCES, RECURRENCE_LABEL } from '../../lib/tasks.ts'
import type { TaskForm } from '../../hooks/useTaskForm.ts'

/** The Repeats picker both task modals share. `idPrefix` keeps the
 *  label-to-select id unique between the two. */
export function TaskRepeatsField({ form, idPrefix }: { form: TaskForm; idPrefix: string }) {
  return (
    <BrutalField label="Repeats" htmlFor={`${idPrefix}-repeats`}>
      <BrutalSelect
        id={`${idPrefix}-repeats`}
        value={form.recurrence}
        onChange={(e) => form.setRecurrence(e.target.value as TaskForm['recurrence'])}
      >
        <option value="">Does not repeat</option>
        {RECURRENCES.map((r) => (
          <option key={r} value={r}>
            {RECURRENCE_LABEL[r]}
          </option>
        ))}
      </BrutalSelect>
    </BrutalField>
  )
}
