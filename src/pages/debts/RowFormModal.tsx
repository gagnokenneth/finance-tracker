import { useState } from 'react'
import type { FormEvent } from 'react'
import { Modal } from '../../components/Modal.tsx'
import { Field, TextInput, Button, SecondaryButton } from '../../components/ui.tsx'
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
  const [paid, setPaid] = useState(initial?.paid ?? false)
  const [paidDate, setPaidDate] = useState(initial?.paid_date ?? isoDate())
  const [paidAmount, setPaidAmount] = useState(
    initial?.paid_amount !== undefined ? String(initial.paid_amount) : '',
  )

  const submit = (e: FormEvent) => {
    e.preventDefault()
    // Unchecking Paid clears the payment fields — this is how a mistaken
    // payment is undone.
    const paidFields = paid
      ? { paid: true as const, paid_date: paidDate, paid_amount: Number(paidAmount) }
      : { paid: false as const, paid_date: undefined, paid_amount: undefined }

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
    <Modal open={open} title={title ?? `${isEdit ? 'Edit' : 'Add'} ${noun}`} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <Field label={kind === 'schedule' ? 'Due date' : 'Payment due date'} required>
          <TextInput
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            required
          />
        </Field>

        {kind === 'schedule' ? (
          <Field label="Amount" required>
            <TextInput
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </Field>
        ) : (
          <>
            <Field label="Minimum amount due">
              <TextInput
                type="number"
                step="0.01"
                min="0"
                value={minDue}
                onChange={(e) => setMinDue(e.target.value)}
              />
            </Field>
            <Field label="Total amount due">
              <TextInput
                type="number"
                step="0.01"
                min="0"
                value={totalDue}
                onChange={(e) => setTotalDue(e.target.value)}
              />
            </Field>
            <Field label="Outstanding balance">
              <TextInput
                type="number"
                step="0.01"
                min="0"
                value={outstanding}
                onChange={(e) => setOutstanding(e.target.value)}
              />
            </Field>
          </>
        )}

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
