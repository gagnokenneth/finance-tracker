import { Field, SelectInput } from '../../components/ui.tsx'
import { activeSources } from '../../lib/income.ts'
import type { IncomeSource } from '../../types.ts'

/**
 * Offers only saved, unarchived sources. A source created moments ago still
 * carries a temp id, and an entry referencing one would be written against an
 * id the backend has never seen.
 */
export function SourcePicker({
  sources,
  value,
  onChange,
}: {
  sources: IncomeSource[]
  value: number | null
  onChange: (id: number | null) => void
}) {
  const options = activeSources(sources)

  return (
    <Field label="Source">
      <SelectInput
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
      >
        <option value="">Select a source…</option>
        {options.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </SelectInput>
      {options.length === 0 && (
        <p className="mt-1 text-xs text-ink-faint">
          No sources yet — add one from Manage sources first.
        </p>
      )}
    </Field>
  )
}
