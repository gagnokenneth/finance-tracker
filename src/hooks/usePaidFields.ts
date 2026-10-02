import { useState } from 'react'

/**
 * The Paid checkbox and its date/amount, shared by the debt-row and bill-payable
 * edit forms. `fallbackDate` seeds the paid date when the row has none yet.
 *
 * `paidFields` is what the form submits: unchecking Paid clears the payment
 * fields — this is how a mistaken payment is undone.
 */
export function usePaidFields(
  initial: { paid?: boolean; paid_date?: string; paid_amount?: number } | null,
  fallbackDate: string,
) {
  const [paid, setPaid] = useState(initial?.paid ?? false)
  const [paidDate, setPaidDate] = useState(initial?.paid_date ?? fallbackDate)
  const [paidAmount, setPaidAmount] = useState(initial?.paid_amount !== undefined ? String(initial.paid_amount) : '')

  const paidFields = paid
    ? { paid: true as const, paid_date: paidDate, paid_amount: Number(paidAmount) }
    : { paid: false as const, paid_date: undefined, paid_amount: undefined }

  return { paid, setPaid, paidDate, setPaidDate, paidAmount, setPaidAmount, paidFields }
}

export type PaidFields = ReturnType<typeof usePaidFields>
