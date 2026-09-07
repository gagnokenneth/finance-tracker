import { useState } from 'react'
import type { FormEvent } from 'react'
import { isoDate } from '../lib/currentMonth.ts'
import { Modal } from './Modal.tsx'
import { Money } from './Money.tsx'
import { Field, TextInput, SelectInput, Button, SecondaryButton } from './ui.tsx'

export interface PayResult {
  paid: true
  paid_date: string
  paid_amount: number
  /** Whether this payment draws on the savings balance. */
  from_savings: boolean
}

/**
 * Records a payment against one row. `defaultAmount` is the row's scheduled
 * installment for a fixed debt, the minimum due for a revolving one, or a bill
 * payable's amount — the usual case, but always editable.
 */
export function PayModal({
  open,
  defaultAmount,
  savingsBalance,
  onSubmit,
  onClose,
}: {
  open: boolean
  defaultAmount: number
  savingsBalance: number
  onSubmit: (result: PayResult) => void
  onClose: () => void
}) {
  const [date, setDate] = useState(isoDate())
  const [amount, setAmount] = useState(String(defaultAmount))
  const [fromSavings, setFromSavings] = useState(false)
  /*
   * Compared in cents, matching assertNotBelowZero's Math.round(x * 100) guard:
   * the backend is the authority, and comparing raw floats here made this
   * courtesy check stricter than the guard it previews.
   *
   * Only for a payment dated today or earlier. The backend counts a future-dated
   * outflow against nothing (balanceAsOf excludes rows whose date has not
   * arrived), so blocking one here would refuse a write the authority accepts.
   */
  const counted = date <= isoDate()
  const overdrawn =
    fromSavings && counted && Math.round(Number(amount) * 100) > Math.round(savingsBalance * 100)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    onSubmit({ paid: true, paid_date: date, paid_amount: Number(amount), from_savings: fromSavings })
  }

  return (
    <Modal open={open} title="Record payment" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <Field label="Payment date" required>
          <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </Field>
        <Field label="Amount paid" required>
          {/* Savings requires a positive amount; the untracked source does not,
              and a variable payable or a statement can legitimately be 0. */}
          <TextInput
            type="number"
            step="0.01"
            min={fromSavings ? '0.01' : '0'}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </Field>
        <Field label="Paid from">
          <SelectInput
            value={fromSavings ? 'savings' : 'other'}
            onChange={(e) => setFromSavings(e.target.value === 'savings')}
          >
            <option value="other">Income or cash (not tracked)</option>
            <option value="savings">Savings</option>
          </SelectInput>
          {fromSavings && (
            <p className="mt-1 text-xs text-ink-faint">
              Savings balance <Money value={savingsBalance} />
            </p>
          )}
          {overdrawn && (
            <p className="mt-1 text-xs text-overdue">
              That is more than the savings balance.
            </p>
          )}
        </Field>
        <div className="mt-1 flex justify-end gap-2">
          <SecondaryButton type="button" onClick={onClose}>
            Cancel
          </SecondaryButton>
          <Button type="submit" disabled={overdrawn}>
            Record payment
          </Button>
        </div>
      </form>
    </Modal>
  )
}
