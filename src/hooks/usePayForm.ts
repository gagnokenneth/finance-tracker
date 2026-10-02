import { useState } from 'react'
import type { FormEvent } from 'react'
import { isoDate } from '../lib/currentMonth.ts'

export interface PayResult {
  paid: true
  paid_date: string
  paid_amount: number
  /** Whether this payment draws on the savings balance. */
  from_savings: boolean
}

/**
 * Shared state for both Pay modals (the original and the revamp's). Records a
 * payment against one row. `defaultAmount` is the row's scheduled installment
 * for a fixed debt, the minimum due for a revolving one, or a bill payable's
 * amount — the usual case, but always editable.
 */
export function usePayForm(defaultAmount: number, savingsBalance: number, onSubmit: (result: PayResult) => void) {
  const [date, setDate] = useState(() => isoDate())
  const [amount, setAmount] = useState(String(defaultAmount))
  const [fromSavings, setFromSavings] = useState(false)
  /*
   * Compared in cents, matching assertNotBelowZero's Math.round(x * 100) guard:
   * the backend is the authority, and comparing raw floats here made this
   * courtesy check stricter than the guard it previews.
   *
   * Only for a payment dated today or earlier. The backend counts a future-dated
   * outflow against nothing (balanceAsOf excludes rows whose date has not
   * arrived), so blocking one here would refuse a write the authority accepts.
   */
  const counted = date <= isoDate()
  const overdrawn =
    fromSavings && counted && Math.round(Number(amount) * 100) > Math.round(savingsBalance * 100)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    onSubmit({ paid: true, paid_date: date, paid_amount: Number(amount), from_savings: fromSavings })
  }

  return { date, setDate, amount, setAmount, fromSavings, setFromSavings, overdrawn, submit }
}
