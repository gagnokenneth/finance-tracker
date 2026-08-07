import { useState } from 'react'
import type { FormEvent } from 'react'
import { isoDate } from '../../lib/currentMonth.ts'
import { Modal } from '../../components/Modal.tsx'
import { Field, TextInput, Button, SecondaryButton } from '../../components/ui.tsx'

export interface PayResult {
  paid: true
  paid_date: string
  paid_amount: number
}

/**
 * Records a payment against one row. `defaultAmount` is the row's scheduled
 * installment for a fixed debt, or the minimum due for a revolving one — the
 * usual case, but always editable.
 */
export function PayModal({
  open,
  defaultAmount,
  pending,
  error,
  onSubmit,
  onClose,
}: {
  open: boolean
  defaultAmount: number
  pending?: boolean
  error?: boolean
  onSubmit: (result: PayResult) => void
  onClose: () => void
}) {
  const [date, setDate] = useState(isoDate())
  const [amount, setAmount] = useState(String(defaultAmount))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    onSubmit({ paid: true, paid_date: date, paid_amount: Number(amount) })
  }

  return (
    <Modal open={open} title="Record Payment" onClose={onClose}>
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
        {error && <p className="text-sm text-red-600">Could not save the payment. Try again.</p>}
        <div className="mt-1 flex justify-end gap-2">
          <SecondaryButton type="button" onClick={onClose}>
            Cancel
          </SecondaryButton>
          <Button type="submit" disabled={pending}>
            Confirm
          </Button>
        </div>
      </form>
    </Modal>
  )
}
