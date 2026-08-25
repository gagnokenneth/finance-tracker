import { useState } from 'react'
import type { FormEvent } from 'react'
import { isoDate } from '../lib/currentMonth.ts'
import { Modal } from './Modal.tsx'
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
  const overdrawn = fromSavings && Number(amount) > savingsBalance

  const submit = (e: FormEvent) => {
    e.preventDefault()
    onSubmit({ paid: true, paid_date: date, paid_amount: Number(amount), from_savings: fromSavings })
  }

  return (
    <Modal open={open} title="Record payment" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <Field label="Payment date">
          <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </Field>
        <Field label="Amount paid">
          <TextInput
            type="number"
            step="0.01"
            min="0"
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
              Savings balance {savingsBalance.toFixed(2)}
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
