import { useState } from 'react'
import type { FormEvent } from 'react'
import { Modal } from '../../components/Modal.tsx'
import { Field, TextInput, Button, SecondaryButton } from '../../components/ui.tsx'
import { useFinanceMutations } from '../../hooks/useFinanceMutations.ts'
import { activeSources } from '../../lib/income.ts'
import { SourcePicker } from './SourcePicker.tsx'
import type { IncomeEntry, IncomeSource } from '../../types.ts'

export function EditIncomeModal({
  open,
  entry,
  sources,
  onClose,
  onMonthChange,
}: {
  open: boolean
  entry: IncomeEntry
  sources: IncomeSource[]
  onClose: () => void
  /** Called when the saved date leaves the month on screen, so the view follows. */
  onMonthChange: (month: string) => void
}) {
  const { updateIncome } = useFinanceMutations()
  const [sourceId, setSourceId] = useState<number | null>(entry.source_id)
  const [amount, setAmount] = useState(String(entry.amount))
  const [date, setDate] = useState(entry.date)
  const [notes, setNotes] = useState(entry.notes ?? '')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const valid = activeSources(sources).some((s) => s.id === sourceId)
    if (!valid || !amount) return
    updateIncome.mutate({
      id: entry.id,
      patch: {
        source_id: sourceId as number,
        amount: Number(amount),
        date,
        notes: notes.trim() || null,
      },
    })
    // An entry moved to another month would otherwise disappear with no
    // explanation, which reads as data loss. Compared as yyyy-mm string
    // prefixes, not via `new Date(iso)` — that parses as UTC midnight, which
    // is the previous day's month anywhere west of UTC.
    const moved = date.slice(0, 7) !== entry.date.slice(0, 7)
    if (moved) onMonthChange(date.slice(0, 7))
    onClose()
  }

  return (
    <Modal open={open} title="Edit income" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <SourcePicker sources={sources} value={sourceId} onChange={setSourceId} />
        <Field label="Amount">
          <TextInput
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </Field>
        <Field label="Date">
          <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Notes">
          <TextInput value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2">
          <SecondaryButton type="button" onClick={onClose}>
            Cancel
          </SecondaryButton>
          <Button type="submit">Save</Button>
        </div>
      </form>
    </Modal>
  )
}
