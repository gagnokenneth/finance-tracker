import { useFinanceMutations } from '../../hooks/useFinanceMutations.ts'
import { IncomeFormModal } from './IncomeFormModal.tsx'
import type { IncomeEntry, IncomeSource } from '../../types.ts'

export function EditIncomeModal({
  entry,
  sources,
  onClose,
  onMonthChange,
}: {
  entry: IncomeEntry
  sources: IncomeSource[]
  onClose: () => void
  /** Called when the saved date leaves the month on screen, so the view follows. */
  onMonthChange: (month: string) => void
}) {
  const { updateIncome } = useFinanceMutations()
  return (
    <IncomeFormModal
      title="Edit income"
      submitLabel="Save"
      look="plain"
      sources={sources}
      initial={entry}
      onSubmit={({ notes, ...values }) => {
        // null is the wire's "clear this" for a patch.
        updateIncome.mutate({ id: entry.id, patch: { ...values, notes: notes || null } })
        // An entry moved to another month would otherwise disappear with no
        // explanation, which reads as data loss. Compared as yyyy-mm string
        // prefixes, not via `new Date(iso)` — that parses as UTC midnight, which
        // is the previous day's month anywhere west of UTC.
        if (values.date.slice(0, 7) !== entry.date.slice(0, 7)) onMonthChange(values.date.slice(0, 7))
        onClose()
      }}
      onClose={onClose}
    />
  )
}
