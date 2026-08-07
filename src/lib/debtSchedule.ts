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
    throw new Error('Number of months must be a whole number of at least 1')
  }
  if (!(total > 0)) {
    throw new Error('Total balance must be greater than zero')
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
