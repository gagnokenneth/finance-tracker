import { useState } from 'react'
import type { FormEvent } from 'react'
import {
  BrutalModal,
  BrutalModalBody,
  BrutalModalFooter,
  BrutalField,
  BrutalMoneyInput,
  BrutalButton,
  BrutalSecondaryButton,
} from '../../components/brutal.tsx'
import { BrutalDatePicker } from '../../components/BrutalDatePicker.tsx'
import { BrutalPaidFields } from '../../components/BrutalPaidFields.tsx'
import { usePaidFields } from '../../hooks/usePaidFields.ts'
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
  const paidState = usePaidFields(row, row.due_date)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    // Unchecking Paid also un-mints the payable that the payment created.
    const { paidFields } = paidState

    onSubmit({
      due_date: dueDate,
      // An empty field means "not set yet", which is a real state for a variable
      // bill — not zero.
      amount: amount === '' ? undefined : Number(amount),
      ...paidFields,
    })
  }

  return (
    <BrutalModal open={open} title={title} onClose={onClose} look="plain">
      <form onSubmit={submit}>
        <BrutalModalBody>
          <BrutalField label="Due date" htmlFor="payable-due" required>
            <BrutalDatePicker id="payable-due" value={dueDate} onChange={setDueDate} />
          </BrutalField>
          <BrutalField label="Amount" htmlFor="payable-amount">
            <BrutalMoneyInput id="payable-amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </BrutalField>

          <BrutalPaidFields fields={paidState} idPrefix="payable" />
        </BrutalModalBody>

        <BrutalModalFooter>
          <BrutalSecondaryButton type="button" onClick={onClose}>
            Cancel
          </BrutalSecondaryButton>
          <BrutalButton type="submit">Save</BrutalButton>
        </BrutalModalFooter>
      </form>
    </BrutalModal>
  )
}
