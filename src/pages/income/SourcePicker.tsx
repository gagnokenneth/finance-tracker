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
  includeId,
}: {
  sources: IncomeSource[]
  value: number | null
  onChange: (id: number | null) => void
  /**
   * A source to offer even when activeSources would exclude it — the one an
   * entry already uses. Without it, archiving a source makes every entry that
   * uses it uneditable: the select renders blank and submit silently refuses.
   * Archiving is meant to retire a source while keeping its history editable.
   */
  includeId?: number
}) {
  const options = activeSources(sources)
  const current =
    includeId !== undefined && !options.some((s) => s.id === includeId)
      ? sources.find((s) => s.id === includeId)
      : undefined
  const shown = current ? [...options, current] : options

  return (
    <Field label="Source">
      <SelectInput
        required
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
      >
        <option value="">Select a source…</option>
        {shown.map((s) => (
          <option key={s.id} value={s.id}>
            {s.archived ? `${s.name} (archived)` : s.name}
          </option>
        ))}
      </SelectInput>
      {shown.length === 0 && (
        <p className="mt-1 text-xs text-ink-faint">
          No sources yet — add one from Manage sources first.
        </p>
      )}
    </Field>
  )
}
