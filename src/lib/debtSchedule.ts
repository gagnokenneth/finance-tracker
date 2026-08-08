import { isoDate } from './currentMonth.ts'

/**
 * Adds n months to an ISO date, clamping to the last valid day of the target
 * month. 2026-01-31 + 1 month is 2026-02-28, not 2026-03-03.
 */
export function addMonthsClamped(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const target = new Date(y, m - 1 + n, 1)
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
  target.setDate(Math.min(d, lastDay))
  return isoDate(target)
}

export interface GeneratedRow {
  due_date: string
  amount: number
  paid: boolean
}

/**
 * Rejected input, as opposed to a bug in here. Only these carry a message
 * written for the person typing; anything else escaping this module is ours.
 */
export class ScheduleInputError extends Error {}

/**
 * Ten years. Longer than any term this is meant to track, and short enough that
 * a mistyped figure cannot generate thousands of rows in one write.
 *
 * This bounds a single generated schedule, not a debt's row count — rows added
 * one at a time afterwards are not counted against it. Guarding those too would
 * mean threading a live count through the row form to reject the 121st manual
 * add, which is complexity for a case that does not happen.
 */
export const MAX_GENERATED_MONTHS = 120

/**
 * Splits `total` across `months` monthly installments starting at
 * `firstDueDate`. Works in integer cents; the last row absorbs the rounding
 * remainder so the rows sum to exactly `total`.
 */
export function buildSchedule(
  firstDueDate: string,
  total: number,
  months: number,
): GeneratedRow[] {
  if (!Number.isInteger(months) || months < 1) {
    throw new ScheduleInputError('Number of months must be a whole number of at least 1')
  }
  if (months > MAX_GENERATED_MONTHS) {
    throw new ScheduleInputError(`Number of months cannot be more than ${MAX_GENERATED_MONTHS}`)
  }
  if (!(total > 0)) {
    throw new ScheduleInputError('Total balance must be greater than zero')
  }
  const totalCents = Math.round(total * 100)
  const perCents = Math.floor(totalCents / months)
  const rows: GeneratedRow[] = []
  for (let i = 0; i < months; i++) {
    const isLast = i === months - 1
    const cents = isLast ? totalCents - perCents * (months - 1) : perCents
    rows.push({
      due_date: addMonthsClamped(firstDueDate, i),
      amount: cents / 100,
      paid: false,
    })
  }
  return rows
}
