import { useState } from 'react'
import type { FormEvent } from 'react'
import {
  sortedDays,
  validateRecurrence,
  BillScheduleInputError,
  FREQUENCY_LABEL,
  MONTH_LABEL,
} from '../../lib/billSchedule.ts'
import { Modal } from '../../components/Modal.tsx'
import { Field, TextInput, SelectInput, Button, SecondaryButton } from '../../components/ui.tsx'
import type { Bill, BillFrequency, BillType } from '../../types.ts'
import type { BillPatch } from '../../api/FinanceApi.ts'

const FREQUENCIES: BillFrequency[] = ['bimonthly', 'monthly', 'quarterly', 'annually']

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
  const [name, setName] = useState(bill.name)
  const [type, setType] = useState<BillType>(bill.type)
  const [frequency, setFrequency] = useState<BillFrequency>(bill.frequency)
  const [amount, setAmount] = useState(bill.amount !== undefined ? String(bill.amount) : '')
  const [day, setDay] = useState(String(bill.day))
  const [secondDay, setSecondDay] = useState(String(bill.second_day ?? ''))
  const [month, setMonth] = useState(String(bill.month ?? 1))

  const days = sortedDays({ frequency, day: Number(day), second_day: Number(secondDay) })
  const patch: BillPatch = {
    name,
    type,
    frequency,
    amount: type === 'fixed' ? Number(amount) : undefined,
    day: frequency === 'bimonthly' ? days.day : Number(day),
    second_day: frequency === 'bimonthly' ? days.second_day : undefined,
    month: frequency === 'annually' ? Number(month) : undefined,
  }

  let formError: string | null = null
  try {
    validateRecurrence({
      frequency,
      day: patch.day as number,
      second_day: patch.second_day,
      month: patch.month,
    })
  } catch (err) {
    // Only BillScheduleInputError is written for the reader; see AddBillModal.
    formError =
      err instanceof BillScheduleInputError
        ? err.message
        : 'Could not work out when this bill is due'
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!name || formError) return
    if (type === 'fixed' && !amount) return
    onSubmit(patch)
  }

  return (
    <Modal open={open} title="Edit bill" onClose={onClose}>
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

        <p className="text-xs text-ink-soft">
          A new schedule applies from the next payable — the ones already listed stay put.
        </p>
        {formError && <p className="text-xs text-overdue">{formError}</p>}

        <div className="mt-1 flex justify-end gap-2">
          <SecondaryButton type="button" onClick={onClose}>
            Cancel
          </SecondaryButton>
          <Button type="submit" disabled={formError !== null}>
            Save
          </Button>
        </div>
      </form>
    </Modal>
  )
}
