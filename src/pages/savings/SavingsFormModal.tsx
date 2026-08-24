import { useState } from 'react'
import type { FormEvent } from 'react'
import { Modal } from '../../components/Modal.tsx'
import { Field, TextInput, SelectInput, Button, SecondaryButton } from '../../components/ui.tsx'
import { useFinanceMutations } from '../../hooks/useFinanceMutations.ts'
import { isoDate } from '../../lib/currentMonth.ts'
import type { SavingsLedgerEntry, SavingsMovementKind } from '../../types.ts'

/**
 * Serves add and edit. `entry` absent means add.
 *
 * The form collects a POSITIVE magnitude plus a kind; the sign is derived
 * downstream, so the kind and the sign cannot disagree. An existing row's
 * amount is signed, hence Math.abs when prefilling.
 */
export function SavingsFormModal({
  open,
  entry,
  onClose,
  onMonthChange,
}: {
  open: boolean
  entry?: SavingsLedgerEntry
  onClose: () => void
  /** Called when an edit moves the row out of the month on screen. */
  onMonthChange?: (month: string) => void
}) {
  const { addSavingsEntry, updateSavingsEntry } = useFinanceMutations()
  const [kind, setKind] = useState<SavingsMovementKind>(
    entry && entry.amount < 0 ? 'withdrawal' : 'deposit',
  )
  const [amount, setAmount] = useState(entry ? String(Math.abs(entry.amount)) : '')
  const [date, setDate] = useState(entry ? entry.date : isoDate())
  const [notes, setNotes] = useState(entry?.notes ?? '')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!amount) return
    if (entry) {
      updateSavingsEntry.mutate({
        id: entry.id,
        patch: { kind, amount: Number(amount), date, notes: notes.trim() || null },
      })
      // Compared as yyyy-mm strings, NOT via new Date(iso): an ISO string parses
      // as UTC midnight, so west of UTC this guard would silently fail to fire
      // while the table, which compares strings, has already dropped the row.
      if (date.slice(0, 7) !== entry.date.slice(0, 7)) onMonthChange?.(date.slice(0, 7))
    } else {
      addSavingsEntry.mutate({
        kind,
        amount: Number(amount),
        date,
        notes: notes.trim() || undefined,
      })
    }
    onClose()
  }

  return (
    <Modal open={open} title={entry ? 'Edit movement' : 'Add movement'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Kind">
          <SelectInput
            required
            value={kind}
            onChange={(e) => setKind(e.target.value as SavingsMovementKind)}
          >
            <option value="deposit">Deposit</option>
            <option value="withdrawal">Withdrawal</option>
          </SelectInput>
        </Field>
        <Field label="Amount">
          <TextInput
            required
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </Field>
        <Field label="Date">
          <TextInput
            required
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </Field>
        <Field label="Notes">
          <TextInput value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2">
          <SecondaryButton type="button" onClick={onClose}>
            Cancel
          </SecondaryButton>
          <Button type="submit">{entry ? 'Save' : 'Add movement'}</Button>
        </div>
      </form>
    </Modal>
  )
}
