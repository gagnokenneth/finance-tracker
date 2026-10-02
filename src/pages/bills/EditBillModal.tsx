import type { FormEvent } from 'react'
import { useBillForm } from '../../hooks/useBillForm.ts'
import {
  BrutalFormError,
  BrutalModal,
  BrutalModalBody,
  BrutalModalFooter,
  BrutalButton,
  BrutalSecondaryButton,
} from '../../components/brutal.tsx'
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
    <BrutalModal open={open} title="Edit bill" onClose={onClose} look="plain">
      <form onSubmit={submit}>
        <BrutalModalBody>
          <BillFormFields form={form} />
          <p className="font-mono text-xs text-neutral-500">
            A new schedule applies from the next payable — the ones already listed stay put.
          </p>
          {form.error && <BrutalFormError>{form.error}</BrutalFormError>}
        </BrutalModalBody>

        <BrutalModalFooter>
          <BrutalSecondaryButton type="button" onClick={onClose}>
            Cancel
          </BrutalSecondaryButton>
          <BrutalButton type="submit" disabled={form.error !== null}>
            Save
          </BrutalButton>
        </BrutalModalFooter>
      </form>
    </BrutalModal>
  )
}
