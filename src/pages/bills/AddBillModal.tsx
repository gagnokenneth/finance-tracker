import { useState } from 'react'
import type { FormEvent } from 'react'
import { useFinanceMutations } from '../../hooks/useFinanceMutations.ts'
import {
  firstDueDate,
  sortedDays,
  validateRecurrence,
  BillScheduleInputError,
  FREQUENCY_LABEL,
  MONTH_LABEL,
} from '../../lib/billSchedule.ts'
import { Modal } from '../../components/Modal.tsx'
import { Field, TextInput, SelectInput, Button, SecondaryButton } from '../../components/ui.tsx'
import type { BillFrequency, BillType } from '../../types.ts'
import type { NewBill } from '../../api/FinanceApi.ts'

const FREQUENCIES: BillFrequency[] = ['bimonthly', 'monthly', 'quarterly', 'annually']

export function AddBillModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addBill } = useFinanceMutations()

  const [name, setName] = useState('')
  const [type, setType] = useState<BillType>('fixed')
  const [frequency, setFrequency] = useState<BillFrequency>('monthly')
  const [amount, setAmount] = useState('')
  const [day, setDay] = useState('1')
  const [secondDay, setSecondDay] = useState('15')
  const [month, setMonth] = useState('1')

  const days = sortedDays({ frequency, day: Number(day), second_day: Number(secondDay) })
  const recurrence = {
    frequency,
    day: frequency === 'bimonthly' ? days.day : Number(day),
    second_day: frequency === 'bimonthly' ? days.second_day : undefined,
    month: frequency === 'annually' ? Number(month) : undefined,
  }

  // Working out the first due date doubles as validation, the way AddDebtModal
  // previews a schedule: the message thrown is the one worth showing.
  let firstDue: string | null = null
  let formError: string | null = null
  try {
    validateRecurrence(recurrence)
    firstDue = firstDueDate(recurrence)
  } catch (err) {
    // Only BillScheduleInputError is written for the reader. Anything else is a
    // bug in here, and this runs during render with no error boundary to catch it.
    formError =
      err instanceof BillScheduleInputError
        ? err.message
        : 'Could not work out when this bill is due'
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!name || formError || firstDue === null) return
    if (type === 'fixed' && !amount) return

    const input: NewBill = {
      name,
      type,
      frequency,
      amount: type === 'fixed' ? Number(amount) : undefined,
      day: recurrence.day,
      second_day: recurrence.second_day,
      month: recurrence.month,
      first_due_date: firstDue,
    }
    addBill.mutate(input, { onSuccess: onClose })
  }

  return (
    <Modal open={open} title="Add bill" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <Field label="Name">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>
        <Field label="Type">
          <SelectInput value={type} onChange={(e) => setType(e.target.value as BillType)}>
            <option value="fixed">Fixed — same amount every time</option>
            <option value="variable">Variable — amount set each time</option>
          </SelectInput>
        </Field>
        <Field label="Frequency">
          <SelectInput
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as BillFrequency)}
          >
            {FREQUENCIES.map((f) => (
              <option key={f} value={f}>
                {FREQUENCY_LABEL[f]}
              </option>
            ))}
          </SelectInput>
        </Field>

        {type === 'fixed' && (
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
        )}

        {frequency === 'annually' && (
          <Field label="Due month">
            <SelectInput value={month} onChange={(e) => setMonth(e.target.value)}>
              {MONTH_LABEL.map((label, i) => (
                <option key={label} value={i + 1}>
                  {label}
                </option>
              ))}
            </SelectInput>
          </Field>
        )}

        <Field label={frequency === 'bimonthly' ? 'First due day' : 'Due day of the month'}>
          <TextInput
            type="number"
            step="1"
            min="1"
            max="31"
            value={day}
            onChange={(e) => setDay(e.target.value)}
            required
          />
        </Field>

        {frequency === 'bimonthly' && (
          <Field label="Second due day">
            <TextInput
              type="number"
              step="1"
              min="1"
              max="31"
              value={secondDay}
              onChange={(e) => setSecondDay(e.target.value)}
              required
            />
          </Field>
        )}

        {firstDue && !formError && (
          <p className="text-xs text-ink-soft">→ First payable due {firstDue}</p>
        )}
        {formError && <p className="text-xs text-overdue">{formError}</p>}
        {addBill.isError && (
          <p className="text-sm text-overdue">
            That bill didn’t save. Check your connection and try again.
          </p>
        )}

        <div className="mt-1 flex justify-end gap-2">
          <SecondaryButton type="button" onClick={onClose}>
            Cancel
          </SecondaryButton>
          <Button type="submit" disabled={addBill.isPending || formError !== null}>
            Add bill
          </Button>
        </div>
      </form>
    </Modal>
  )
}
