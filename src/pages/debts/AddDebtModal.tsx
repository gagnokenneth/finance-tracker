import { useState } from 'react'
import type { FormEvent } from 'react'
import { useFinanceMutations } from '../../hooks/useFinanceMutations.ts'
import { buildSchedule, MAX_GENERATED_MONTHS, ScheduleInputError } from '../../lib/debtSchedule.ts'
import { formatMoney } from '../../lib/money.ts'
import { useCurrency } from '../../hooks/useCurrency.ts'
import { isoDate } from '../../lib/currentMonth.ts'
import {
  BrutalModal,
  BrutalField,
  BrutalInput,
  BrutalMoneyInput,
  BrutalSelect,
  BrutalButton,
  BrutalSecondaryButton,
  BrutalModalBody,
  BrutalModalFooter,
} from '../../components/brutal.tsx'
import { BrutalDatePicker } from '../../components/BrutalDatePicker.tsx'
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
    <BrutalModal open={open} title="Add debt" onClose={onClose}>
      <form onSubmit={submit}>
        <BrutalModalBody>
          <BrutalField label="Name" htmlFor="debt-name" required>
            <BrutalInput id="debt-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} required />
          </BrutalField>
          <BrutalField label="Type" htmlFor="debt-type">
            <BrutalSelect id="debt-type" value={type} onChange={(e) => setType(e.target.value as DebtType)}>
              <option value="fixed">Fixed</option>
              <option value="revolving">Revolving</option>
            </BrutalSelect>
          </BrutalField>

          {type === 'fixed' ? (
            <>
              <BrutalField label="First due date" htmlFor="debt-first-due" required>
                <BrutalDatePicker id="debt-first-due" value={firstDue} onChange={setFirstDue} />
              </BrutalField>
              <BrutalField label="Total balance" htmlFor="debt-total" required>
                <BrutalMoneyInput id="debt-total" required value={total} onChange={(e) => setTotal(e.target.value)} />
              </BrutalField>
              <BrutalField label="Number of months" htmlFor="debt-months" required>
                <BrutalInput
                  id="debt-months"
                  type="number"
                  step="1"
                  min="1"
                  max={MAX_GENERATED_MONTHS}
                  value={months}
                  onChange={(e) => setMonths(e.target.value)}
                  required
                />
              </BrutalField>
              {preview && <p className="font-mono text-xs text-neutral-600">→ {preview}</p>}
              {previewError && <p className="font-mono text-xs font-bold text-black">{previewError}</p>}
            </>
          ) : (
            <>
              <BrutalField label="Payment due date" htmlFor="debt-due" required>
                <BrutalDatePicker id="debt-due" value={dueDate} onChange={setDueDate} />
              </BrutalField>
              <BrutalField label="Minimum amount due" htmlFor="debt-min" required>
                <BrutalMoneyInput id="debt-min" required value={minDue} onChange={(e) => setMinDue(e.target.value)} />
              </BrutalField>
              <BrutalField label="Total amount due" htmlFor="debt-total-due" required>
                <BrutalMoneyInput id="debt-total-due" required value={totalDue} onChange={(e) => setTotalDue(e.target.value)} />
              </BrutalField>
              <BrutalField label="Outstanding balance" htmlFor="debt-outstanding" required>
                <BrutalMoneyInput
                  id="debt-outstanding"
                  required
                  value={outstanding}
                  onChange={(e) => setOutstanding(e.target.value)}
                />
              </BrutalField>
            </>
          )}
        </BrutalModalBody>

        <BrutalModalFooter>
          <BrutalSecondaryButton type="button" onClick={onClose}>
            Cancel
          </BrutalSecondaryButton>
          {/* previewError stays: that is validation, which fires before any
              write and so has nothing to do with waiting. */}
          <BrutalButton type="submit" disabled={previewError !== null}>
            Add debt
          </BrutalButton>
        </BrutalModalFooter>
      </form>
    </BrutalModal>
  )
}
