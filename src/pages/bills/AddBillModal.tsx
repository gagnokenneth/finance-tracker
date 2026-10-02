import type { FormEvent } from 'react'
import { useFinanceMutations } from '../../hooks/useFinanceMutations.ts'
import { useBillForm } from '../../hooks/useBillForm.ts'
import { firstDueDate } from '../../lib/billSchedule.ts'
import {
  BrutalFormError,
  BrutalModal,
  BrutalModalBody,
  BrutalModalFooter,
  BrutalButton,
  BrutalSecondaryButton,
} from '../../components/brutal.tsx'
import { BillFormFields } from './BillFormFields.tsx'

export function AddBillModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addBill } = useFinanceMutations()
  const form = useBillForm()

  // The preview doubles as confirmation of the rule: a bill created after this
  // period's due day starts at the next one.
  const firstDue = form.error ? null : firstDueDate(form.recurrence)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!form.values || firstDue === null) return
    // Closing now is the point: the bill is already in the cache, and a failure
    // removes it again and raises a toast.
    onClose()
    addBill.mutate({ ...form.values, first_due_date: firstDue })
  }

  return (
    <BrutalModal open={open} title="Add bill" onClose={onClose}>
      <form onSubmit={submit}>
        <BrutalModalBody>
          <BillFormFields form={form} />
          {firstDue && <p className="font-mono text-xs text-neutral-600">→ First payable due {firstDue}</p>}
          {form.error && <BrutalFormError>{form.error}</BrutalFormError>}
        </BrutalModalBody>

        <BrutalModalFooter>
          <BrutalSecondaryButton type="button" onClick={onClose}>
            Cancel
          </BrutalSecondaryButton>
          <BrutalButton type="submit" disabled={form.error !== null}>
            Add bill
          </BrutalButton>
        </BrutalModalFooter>
      </form>
    </BrutalModal>
  )
}
