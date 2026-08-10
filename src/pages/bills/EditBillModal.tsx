import type { FormEvent } from 'react'
import { useBillForm } from '../../hooks/useBillForm.ts'
import { Modal } from '../../components/Modal.tsx'
import { Button, SecondaryButton } from '../../components/ui.tsx'
import { BillFormFields } from './BillFormFields.tsx'
import type { Bill } from '../../types.ts'
import type { BillPatch } from '../../api/FinanceApi.ts'

/**
 * Edits a bill's name, type, amount and recurrence. Mount it only while the
 * dialog is open — the initial values are read once, on mount.
 *
 * A changed recurrence does not move payables that already exist. It applies
 * from the next payable minted, which is the only one it can apply to without
 * rewriting history.
 */
export function EditBillModal({
  open,
  bill,
  onSubmit,
  onClose,
}: {
  open: boolean
  bill: Bill
  onSubmit: (patch: BillPatch) => void
  onClose: () => void
}) {
  const form = useBillForm(bill)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!form.values) return
    onSubmit(form.values)
  }

  return (
    <Modal open={open} title="Edit bill" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <BillFormFields form={form} />

        <p className="text-xs text-ink-soft">
          A new schedule applies from the next payable — the ones already listed stay put.
        </p>
        {form.error && <p className="text-xs text-overdue">{form.error}</p>}

        <div className="mt-1 flex justify-end gap-2">
          <SecondaryButton type="button" onClick={onClose}>
            Cancel
          </SecondaryButton>
          <Button type="submit" disabled={form.error !== null}>
            Save
          </Button>
        </div>
      </form>
    </Modal>
  )
}
