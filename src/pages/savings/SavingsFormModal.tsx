import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import {
  BrutalModal,
  BrutalModalBody,
  BrutalModalFooter,
  BrutalField,
  BrutalInput,
  BrutalMoneyInput,
  BrutalSelect,
  BrutalButton,
  BrutalSecondaryButton,
} from '../../components/brutal.tsx'
import { BrutalDatePicker } from '../../components/BrutalDatePicker.tsx'
import type { LookName } from '../../components/brutalLook.tsx'
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
  look,
  entry,
  month,
  onClose,
  onMonthChange,
}: {
  /** Set by the caller, like the Add/Edit wrappers elsewhere: grid to add, plain to edit. */
  look: LookName
  entry?: SavingsLedgerEntry
  /** The month currently displayed, so an add landing outside it can be announced. */
  month?: string
  onClose: () => void
  /** Called when an add or edit moves the row out of the month on screen. */
  onMonthChange?: (month: string) => void
}) {
  const { addSavingsEntry, updateSavingsEntry } = useFinanceMutations()
  const id = useId()
  // entry.kind is always 'deposit' or 'withdrawal' here: a payment-kind row
  // exposes no Edit control (Savings.tsx gates on isPaymentKind).
  const [kind, setKind] = useState<SavingsMovementKind>(
    entry ? (entry.kind as SavingsMovementKind) : 'deposit',
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
        // null, not undefined: this is how a blanked notes field clears the cell.
        patch: { kind, amount: Number(amount), date, notes: notes.trim() || null },
      })
    } else {
      // An add has nothing to clear, so undefined rather than null.
      addSavingsEntry.mutate({
        kind,
        amount: Number(amount),
        date,
        notes: notes.trim() || undefined,
      })
    }

    /*
     * Follow the row if it landed outside the month on screen — vanishing with
     * no explanation reads as data loss. An edit is measured against the row's
     * old month, an add against the month being displayed.
     *
     * Compared as yyyy-mm strings, NOT via new Date(iso): an ISO date parses as
     * UTC midnight, so west of UTC this guard would silently fail to fire while
     * the table, which compares strings, has already dropped the row.
     */
    const anchor = entry ? entry.date.slice(0, 7) : month
    if (anchor !== undefined && date.slice(0, 7) !== anchor) onMonthChange?.(date.slice(0, 7))
    onClose()
  }

  return (
    <BrutalModal open title={entry ? 'Edit movement' : 'Add movement'} onClose={onClose} look={look}>
      <form onSubmit={submit}>
        <BrutalModalBody>
          <BrutalField label="Kind" htmlFor={`${id}-kind`} required>
            <BrutalSelect
              id={`${id}-kind`}
              required
              value={kind}
              onChange={(e) => setKind(e.target.value as SavingsMovementKind)}
            >
              <option value="deposit">Deposit</option>
              <option value="withdrawal">Withdrawal</option>
            </BrutalSelect>
          </BrutalField>
          <BrutalField label="Amount" htmlFor={`${id}-amount`} required>
            <BrutalMoneyInput
              id={`${id}-amount`}
              required
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </BrutalField>
          <BrutalField label="Date" htmlFor={`${id}-date`} required>
            <BrutalDatePicker id={`${id}-date`} value={date} onChange={setDate} />
          </BrutalField>
          <BrutalField label="Notes" htmlFor={`${id}-notes`}>
            <BrutalInput id={`${id}-notes`} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </BrutalField>
        </BrutalModalBody>
        <BrutalModalFooter>
          <BrutalSecondaryButton type="button" onClick={onClose}>
            Cancel
          </BrutalSecondaryButton>
          <BrutalButton type="submit">{entry ? 'Save' : 'Add movement'}</BrutalButton>
        </BrutalModalFooter>
      </form>
    </BrutalModal>
  )
}
