import { useState } from 'react'
import type { FormEvent } from 'react'
import {
  BrutalModal,
  BrutalField,
  BrutalMoneyInput,
  BrutalButton,
  BrutalSecondaryButton,
  BrutalModalBody,
  BrutalModalFooter,
} from '../../components/brutal.tsx'
import { BrutalDatePicker } from '../../components/BrutalDatePicker.tsx'
import { BrutalPaidFields } from '../../components/BrutalPaidFields.tsx'
import { usePaidFields } from '../../hooks/usePaidFields.ts'
import { isoDate } from '../../lib/currentMonth.ts'
import type { DebtScheduleRow, DebtStatement } from '../../types.ts'
import type { NewScheduleRow, NewStatement } from '../../api/FinanceApi.ts'

export type RowKind = 'schedule' | 'statement'

/** An empty box clears the figure; null is what survives the wire. */
const figure = (value: string): number | null => (value === '' ? null : Number(value))

/** The statement half of this form. Money fields are nullable — see StatementPatch. */
export type StatementFormValues = Omit<NewStatement, 'min_due' | 'total_due' | 'outstanding'> & {
  min_due: number | null
  total_due: number | null
  outstanding: number | null
}

/**
 * Add or edit one row, for either debt type. Mount it only while a row is
 * being edited — the initial values are read once, on mount.
 */
export function RowFormModal({
  open,
  kind,
  initial,
  title,
  onSubmit,
  onClose,
}: {
  open: boolean
  kind: RowKind
  initial: DebtScheduleRow | DebtStatement | null
  title?: string
  onSubmit: (values: NewScheduleRow | StatementFormValues) => void
  onClose: () => void
}) {
  const asSchedule = initial && 'amount' in initial ? initial : null
  // Not 'min_due' in initial: a cleared figure comes back from both backends
  // with the key absent (JSON.stringify drops undefined), so a
  // partially-cleared statement would wrongly look like "no initial value"
  // and blank out its still-set total_due/outstanding too. amount is the
  // one key that's always present on a schedule row and never on a
  // statement, so negating it is a safe discriminator either way.
  const asStatement = initial && !('amount' in initial) ? initial : null

  const [dueDate, setDueDate] = useState(initial?.due_date ?? isoDate())
  const [amount, setAmount] = useState(asSchedule ? String(asSchedule.amount) : '')
  const [minDue, setMinDue] = useState(asStatement?.min_due !== undefined ? String(asStatement.min_due) : '')
  const [totalDue, setTotalDue] = useState(
    asStatement?.total_due !== undefined ? String(asStatement.total_due) : '',
  )
  const [outstanding, setOutstanding] = useState(
    asStatement?.outstanding !== undefined ? String(asStatement.outstanding) : '',
  )
  const paidState = usePaidFields(initial, isoDate())

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const { paidFields } = paidState

    if (kind === 'schedule') {
      onSubmit({ due_date: dueDate, amount: Number(amount), ...paidFields })
    } else {
      onSubmit({
        due_date: dueDate,
        min_due: figure(minDue),
        total_due: figure(totalDue),
        outstanding: figure(outstanding),
        ...paidFields,
      })
    }
  }

  const isEdit = initial !== null
  const noun = kind === 'schedule' ? 'payment' : 'statement'

  return (
    <BrutalModal open={open} title={title ?? `${isEdit ? 'Edit' : 'Add'} ${noun}`} onClose={onClose} look="plain">
      <form onSubmit={submit}>
        <BrutalModalBody>
          <BrutalField label={kind === 'schedule' ? 'Due date' : 'Payment due date'} htmlFor="row-due" required>
            <BrutalDatePicker id="row-due" value={dueDate} onChange={setDueDate} />
          </BrutalField>

          {kind === 'schedule' ? (
            <BrutalField label="Amount" htmlFor="row-amount" required>
              <BrutalMoneyInput id="row-amount" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </BrutalField>
          ) : (
            <>
              <BrutalField label="Minimum amount due" htmlFor="row-min">
                <BrutalMoneyInput id="row-min" value={minDue} onChange={(e) => setMinDue(e.target.value)} />
              </BrutalField>
              <BrutalField label="Total amount due" htmlFor="row-total">
                <BrutalMoneyInput id="row-total" value={totalDue} onChange={(e) => setTotalDue(e.target.value)} />
              </BrutalField>
              <BrutalField label="Outstanding balance" htmlFor="row-outstanding">
                <BrutalMoneyInput
                  id="row-outstanding"
                  value={outstanding}
                  onChange={(e) => setOutstanding(e.target.value)}
                />
              </BrutalField>
            </>
          )}

          <BrutalPaidFields fields={paidState} idPrefix="row" />
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
