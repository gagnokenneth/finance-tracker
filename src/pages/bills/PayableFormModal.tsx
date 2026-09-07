import { useState } from 'react'
import type { FormEvent } from 'react'
import { Modal } from '../../components/Modal.tsx'
import { Field, TextInput, Button, SecondaryButton } from '../../components/ui.tsx'
import type { BillPayable } from '../../types.ts'
import type { BillPayablePatch } from '../../api/FinanceApi.ts'

/**
 * Edits one payable. Serves both Edit and Set amount — an unpriced variable
 * payable opens this same form, which is why the amount field may start empty
 * and is not required. Mount it only while the dialog is open; the initial
 * values are read once, on mount.
 */
export function PayableFormModal({
  open,
  row,
  title,
  onSubmit,
  onClose,
}: {
  open: boolean
  row: BillPayable
  title: string
  onSubmit: (patch: BillPayablePatch) => void
  onClose: () => void
}) {
  const [dueDate, setDueDate] = useState(row.due_date)
  const [amount, setAmount] = useState(row.amount !== undefined ? String(row.amount) : '')
  const [paid, setPaid] = useState(row.paid)
  const [paidDate, setPaidDate] = useState(row.paid_date ?? row.due_date)
  const [paidAmount, setPaidAmount] = useState(
    row.paid_amount !== undefined ? String(row.paid_amount) : '',
  )

  const submit = (e: FormEvent) => {
    e.preventDefault()
    // Unchecking Paid clears the payment fields and un-mints the payable that
    // the payment created — this is how a mistaken payment is undone.
    const paidFields = paid
      ? { paid: true as const, paid_date: paidDate, paid_amount: Number(paidAmount) }
      : { paid: false as const, paid_date: undefined, paid_amount: undefined }

    onSubmit({
      due_date: dueDate,
      // An empty field means "not set yet", which is a real state for a variable
      // bill — not zero.
      amount: amount === '' ? undefined : Number(amount),
      ...paidFields,
    })
  }

  return (
    <Modal open={open} title={title} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <Field label="Due date" required>
          <TextInput
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            required
          />
        </Field>
        <Field label="Amount">
          <TextInput
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </Field>

        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} />
          Paid
        </label>

        {paid && (
          <>
            <Field label="Paid date" required>
              <TextInput
                type="date"
                value={paidDate}
                onChange={(e) => setPaidDate(e.target.value)}
                required
              />
            </Field>
            <Field label="Paid amount" required>
              <TextInput
                type="number"
                step="0.01"
                min="0"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                required
              />
            </Field>
          </>
        )}

        <div className="mt-1 flex justify-end gap-2">
          <SecondaryButton type="button" onClick={onClose}>
            Cancel
          </SecondaryButton>
          <Button type="submit">Save</Button>
        </div>
      </form>
    </Modal>
  )
}
