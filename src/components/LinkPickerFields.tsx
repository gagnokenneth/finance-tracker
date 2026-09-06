import { Field, SelectInput } from './ui.tsx'

/** A referenceable row this picker can offer as a link target. */
interface LinkOption {
  id: number
  name?: string
  title?: string
}

/**
 * The "link to (optional)" type-select plus its conditional target-select,
 * shared by Notes' and Goals' Add/Edit modals — the two places in this app
 * with a `linked_type`/`linked_id` pair. Owns only the rendering; each
 * caller still owns its own `linkedType`/`linkedId` state and derives
 * `linkOptions`/`needsTarget` itself, since those depend on which pools
 * (bills/debts/tasks vs bills/debts/savings) and which "no target" types
 * (Goals' 'savings') that caller's own link union allows.
 */
export function LinkPickerFields<T extends string>({
  linkLabels,
  linkedType,
  onTypeChange,
  linkedId,
  onIdChange,
  linkOptions,
  needsTarget,
}: {
  linkLabels: Record<T, string>
  linkedType: T | ''
  onTypeChange: (type: T | '') => void
  linkedId: number | ''
  onIdChange: (id: number | '') => void
  linkOptions: LinkOption[]
  needsTarget: boolean
}) {
  return (
    <>
      <Field label="Link to (optional)">
        <SelectInput value={linkedType} onChange={(e) => onTypeChange(e.target.value as T | '')}>
          <option value="">Nothing</option>
          {(Object.keys(linkLabels) as T[]).map((t) => (
            <option key={t} value={t}>
              {linkLabels[t]}
            </option>
          ))}
        </SelectInput>
      </Field>
      {needsTarget && (
        <Field label={linkLabels[linkedType as T]}>
          <SelectInput
            required
            value={linkedId}
            onChange={(e) => onIdChange(e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">Select…</option>
            {linkOptions.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name ?? row.title}
              </option>
            ))}
          </SelectInput>
        </Field>
      )}
    </>
  )
}
