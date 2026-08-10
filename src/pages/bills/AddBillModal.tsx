import type { FormEvent } from 'react'
import { useFinanceMutations } from '../../hooks/useFinanceMutations.ts'
import { useBillForm } from '../../hooks/useBillForm.ts'
import { firstDueDate } from '../../lib/billSchedule.ts'
import { Modal } from '../../components/Modal.tsx'
import { Button, SecondaryButton } from '../../components/ui.tsx'
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
    addBill.mutate({ ...form.values, first_due_date: firstDue }, { onSuccess: onClose })
  }

  return (
    <Modal open={open} title="Add bill" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <BillFormFields form={form} />

        {firstDue && <p className="text-xs text-ink-soft">→ First payable due {firstDue}</p>}
        {form.error && <p className="text-xs text-overdue">{form.error}</p>}
        {addBill.isError && (
          <p className="text-sm text-overdue">
            That bill didn’t save. Check your connection and try again.
          </p>
        )}

        <div className="mt-1 flex justify-end gap-2">
          <SecondaryButton type="button" onClick={onClose}>
            Cancel
          </SecondaryButton>
          <Button type="submit" disabled={addBill.isPending || form.error !== null}>
            Add bill
          </Button>
        </div>
      </form>
    </Modal>
  )
}
