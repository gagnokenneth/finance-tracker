import { useState } from 'react'
import type { FormEvent } from 'react'
import { Modal } from '../../components/Modal.tsx'
import { Field, TextInput, Button } from '../../components/ui.tsx'
import { isoDate } from '../../lib/currentMonth.ts'
import type { DebtScheduleRow, DebtStatement } from '../../types.ts'
import type { NewScheduleRow, NewStatement } from '../../api/FinanceApi.ts'

export type RowKind = 'schedule' | 'statement'

/**
 * Add or edit one row, for either debt type. Mount it only while a row is
 * being edited — the initial values are read once, on mount.
 */
export function RowFormModal({
  open,
  kind,
  initial,
  pending,
  error,
  onSubmit,
  onClose,
}: {
  open: boolean
  kind: RowKind
  initial: DebtScheduleRow | DebtStatement | null
  pending?: boolean
  error?: boolean
  onSubmit: (values: NewScheduleRow | NewStatement) => void
  onClose: () => void
}) {
  const asSchedule = initial && 'amount' in initial ? initial : null
  const asStatement = initial && 'min_due' in initial ? initial : null

  const [dueDate, setDueDate] = useState(initial?.due_date ?? isoDate())
  const [amount, setAmount] = useState(asSchedule ? String(asSchedule.amount) : '')
  const [minDue, setMinDue] = useState(asStatement ? String(asStatement.min_due) : '')
  const [totalDue, setTotalDue] = useState(asStatement ? String(asStatement.total_due) : '')
  const [outstanding, setOutstanding] = useState(
    asStatement ? String(asStatement.outstanding) : '',
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
        min_due: Number(minDue),
        total_due: Number(totalDue),
        outstanding: Number(outstanding),
        ...paidFields,
      })
    }
  }

  const isEdit = initial !== null
  const noun = kind === 'schedule' ? 'Row' : 'Statement'

  return (
    <Modal open={open} title={`${isEdit ? 'Edit' : 'Add'} ${noun}`} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <Field label={kind === 'schedule' ? 'Due date' : 'Payment due date'}>
          <TextInput
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            required
          />
        </Field>

        {kind === 'schedule' ? (
          <Field label="Amount">
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
                required
              />
            </Field>
            <Field label="Total amount due">
              <TextInput
                type="number"
                step="0.01"
                min="0"
                value={totalDue}
                onChange={(e) => setTotalDue(e.target.value)}
                required
              />
            </Field>
            <Field label="Outstanding balance">
              <TextInput
                type="number"
                step="0.01"
                min="0"
                value={outstanding}
                onChange={(e) => setOutstanding(e.target.value)}
                required
              />
            </Field>
          </>
        )}

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} />
          Paid
        </label>

        {paid && (
          <>
            <Field label="Paid date">
              <TextInput
                type="date"
                value={paidDate}
                onChange={(e) => setPaidDate(e.target.value)}
                required
              />
            </Field>
            <Field label="Paid amount">
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

        {error && <p className="text-sm text-red-600">Could not save. Please try again.</p>}

        <div className="mt-1 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Cancel
          </button>
          <Button type="submit" disabled={pending}>
            Save
          </Button>
        </div>
      </form>
    </Modal>
  )
}
