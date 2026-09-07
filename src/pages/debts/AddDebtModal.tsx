import { useState } from 'react'
import type { FormEvent } from 'react'
import { useFinanceMutations } from '../../hooks/useFinanceMutations.ts'
import { buildSchedule, MAX_GENERATED_MONTHS, ScheduleInputError } from '../../lib/debtSchedule.ts'
import { formatMoney } from '../../lib/money.ts'
import { useCurrency } from '../../hooks/useCurrency.ts'
import { isoDate } from '../../lib/currentMonth.ts'
import { Modal } from '../../components/Modal.tsx'
import { Field, TextInput, SelectInput, Button, SecondaryButton } from '../../components/ui.tsx'
import type { DebtType } from '../../types.ts'

export function AddDebtModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addDebt } = useFinanceMutations()
  const currency = useCurrency()

  const [name, setName] = useState('')
  const [type, setType] = useState<DebtType>('fixed')

  // fixed
  const [firstDue, setFirstDue] = useState(isoDate())
  const [total, setTotal] = useState('')
  const [months, setMonths] = useState('')

  // revolving
  const [dueDate, setDueDate] = useState(isoDate())
  const [minDue, setMinDue] = useState('')
  const [totalDue, setTotalDue] = useState('')
  const [outstanding, setOutstanding] = useState('')

  // Preview doubles as validation: buildSchedule throws on bad input, and the
  // message it throws is the one worth showing.
  let preview: string | null = null
  let previewError: string | null = null
  if (type === 'fixed' && total && months) {
    try {
      const rows = buildSchedule(firstDue, Number(total), Number(months))
      preview = `${rows.length} payments of ${formatMoney(rows[0].amount, currency)}`
      if (rows[rows.length - 1].amount !== rows[0].amount) {
        preview += `, last one ${formatMoney(rows[rows.length - 1].amount, currency)}`
      }
    } catch (err) {
      // Only ScheduleInputError is written for the reader. Anything else is a
      // bug in here, and showing its message would blame the typist for it —
      // but it still has to be caught, since this runs during render and the
      // app has no error boundary to fall back on.
      previewError =
        err instanceof ScheduleInputError ? err.message : 'Could not build a schedule from those values'
    }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!name) return

    // Closing before the write is the point: the debt is already in the cache,
    // and a failure removes it again and raises a toast.
    if (type === 'fixed') {
      if (previewError || !total || !months) return
      const rows = buildSchedule(firstDue, Number(total), Number(months))
      onClose()
      addDebt.mutate({ name, type: 'fixed', rows })
      return
    }

    onClose()
    addDebt.mutate({
      name,
      type: 'revolving',
      rows: [
        {
          due_date: dueDate,
          min_due: Number(minDue),
          total_due: Number(totalDue),
          outstanding: Number(outstanding),
          paid: false,
        },
      ],
    })
  }

  return (
    <Modal open={open} title="Add debt" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <Field label="Name" required>
          <TextInput value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>
        <Field label="Type">
          <SelectInput value={type} onChange={(e) => setType(e.target.value as DebtType)}>
            <option value="fixed">Fixed</option>
            <option value="revolving">Revolving</option>
          </SelectInput>
        </Field>

        {type === 'fixed' ? (
          <>
            <Field label="First due date" required>
              <TextInput
                type="date"
                value={firstDue}
                onChange={(e) => setFirstDue(e.target.value)}
                required
              />
            </Field>
            <Field label="Total balance" required>
              <TextInput
                type="number"
                step="0.01"
                min="0"
                value={total}
                onChange={(e) => setTotal(e.target.value)}
                required
              />
            </Field>
            <Field label="Number of months" required>
              <TextInput
                type="number"
                step="1"
                min="1"
                max={MAX_GENERATED_MONTHS}
                value={months}
                onChange={(e) => setMonths(e.target.value)}
                required
              />
            </Field>
            {preview && <p className="text-xs text-ink-soft">→ {preview}</p>}
            {previewError && <p className="text-xs text-overdue">{previewError}</p>}
          </>
        ) : (
          <>
            <Field label="Payment due date" required>
              <TextInput
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
              />
            </Field>
            <Field label="Minimum amount due" required>
              <TextInput
                type="number"
                step="0.01"
                min="0"
                value={minDue}
                onChange={(e) => setMinDue(e.target.value)}
                required
              />
            </Field>
            <Field label="Total amount due" required>
              <TextInput
                type="number"
                step="0.01"
                min="0"
                value={totalDue}
                onChange={(e) => setTotalDue(e.target.value)}
                required
              />
            </Field>
            <Field label="Outstanding balance" required>
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

        <div className="mt-1 flex justify-end gap-2">
          <SecondaryButton type="button" onClick={onClose}>
            Cancel
          </SecondaryButton>
          {/* previewError stays: that is validation, which fires before any
              write and so has nothing to do with waiting. */}
          <Button type="submit" disabled={previewError !== null}>
            Add debt
          </Button>
        </div>
      </form>
    </Modal>
  )
}
