import { useState } from 'react'
import { sortedDays, validateRecurrence, BillScheduleInputError } from '../lib/billSchedule.ts'
import type { BillRecurrence } from '../lib/billSchedule.ts'
import type { Bill, BillFrequency, BillType } from '../types.ts'

/** The bill fields a write carries — everything but the id and the closed flag. */
export type BillValues = Omit<Bill, 'id' | 'closed'>

export interface BillForm {
  name: string
  setName: (v: string) => void
  type: BillType
  setType: (v: BillType) => void
  frequency: BillFrequency
  setFrequency: (v: BillFrequency) => void
  amount: string
  setAmount: (v: string) => void
  day: string
  setDay: (v: string) => void
  secondDay: string
  setSecondDay: (v: string) => void
  month: string
  setMonth: (v: string) => void
  /** Only the fields the chosen frequency uses, so a bill never keeps a stale one. */
  recurrence: BillRecurrence
  /** A message for the typist, or null when the values describe a real schedule. */
  error: string | null
  /** The write payload, or null while the form is incomplete or invalid. */
  values: BillValues | null
}

/**
 * The shared state of the add and edit bill forms. Both collect the same fields
 * and validate them the same way; they differ only in what they do on submit,
 * which is why this holds no mutation of its own.
 */
export function useBillForm(bill?: Bill): BillForm {
  const [name, setName] = useState(bill?.name ?? '')
  const [type, setType] = useState<BillType>(bill?.type ?? 'fixed')
  const [frequency, setFrequency] = useState<BillFrequency>(bill?.frequency ?? 'monthly')
  const [amount, setAmount] = useState(bill?.amount !== undefined ? String(bill.amount) : '')
  const [day, setDay] = useState(String(bill?.day ?? 1))
  // Defaulted rather than left empty so switching an existing monthly bill to
  // bi-monthly opens with a usable second day instead of an error.
  const [secondDay, setSecondDay] = useState(String(bill?.second_day ?? 15))
  const [month, setMonth] = useState(String(bill?.month ?? 1))

  const days = sortedDays({ frequency, day: Number(day), second_day: Number(secondDay) })
  const recurrence: BillRecurrence = {
    frequency,
    day: frequency === 'bimonthly' ? days.day : Number(day),
    second_day: frequency === 'bimonthly' ? days.second_day : undefined,
    month: frequency === 'annually' ? Number(month) : undefined,
  }

  let error: string | null = null
  try {
    validateRecurrence(recurrence)
  } catch (err) {
    // Only BillScheduleInputError is written for the reader. Anything else is a
    // bug in the schedule module, and this runs during render with no error
    // boundary to catch it.
    error =
      err instanceof BillScheduleInputError
        ? err.message
        : 'Could not work out when this bill is due'
  }

  const complete = name !== '' && (type === 'variable' || amount !== '')
  const values: BillValues | null =
    error || !complete
      ? null
      : {
          name,
          type,
          frequency,
          amount: type === 'fixed' ? Number(amount) : undefined,
          day: recurrence.day,
          second_day: recurrence.second_day,
          month: recurrence.month,
        }

  return {
    name,
    setName,
    type,
    setType,
    frequency,
    setFrequency,
    amount,
    setAmount,
    day,
    setDay,
    secondDay,
    setSecondDay,
    month,
    setMonth,
    recurrence,
    error,
    values,
  }
}
