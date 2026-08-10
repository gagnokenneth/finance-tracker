import { isoDate } from './currentMonth.ts'
import type { BillFrequency } from '../types.ts'

/**
 * Rejected input, as opposed to a bug in here. Only these carry a message
 * written for the person typing; anything else escaping this module is ours.
 * The same split debtSchedule.ts makes with ScheduleInputError.
 */
export class BillScheduleInputError extends Error {}

/** The recurrence half of a Bill — everything these functions need to place a due date. */
export interface BillRecurrence {
  frequency: BillFrequency
  /** Day of the month. For bimonthly, the first-half day. */
  day: number
  /** Bimonthly only: the second-half day. */
  second_day?: number
  /** Annually only: 1-12. */
  month?: number
}

export const FREQUENCY_LABEL: Record<BillFrequency, string> = {
  bimonthly: 'Bi-monthly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annually: 'Annually',
}

/** Months between occurrences. Bimonthly is absent: it alternates within a month. */
const MONTH_STEP: Record<Exclude<BillFrequency, 'bimonthly'>, number> = {
  monthly: 1,
  quarterly: 3,
  annually: 12,
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

/**
 * An ISO date for the given day of the given month, clamped to that month's
 * length: a bill due the 31st falls on Feb 28, or Feb 29 in a leap year.
 * `month` is 1-12 and may overflow — 13 rolls into the next January.
 */
function dateOn(year: number, month: number, day: number): string {
  const y = year + Math.floor((month - 1) / 12)
  const m = (((month - 1) % 12) + 12) % 12 + 1
  return isoDate(new Date(y, m - 1, Math.min(day, daysInMonth(y, m))))
}

function isWholeDay(n: number | undefined): boolean {
  return n !== undefined && Number.isInteger(n) && n >= 1 && n <= 31
}

export function validateRecurrence(r: BillRecurrence): void {
  if (!isWholeDay(r.day)) {
    throw new BillScheduleInputError('Due day must be a whole number between 1 and 31')
  }
  if (r.frequency === 'bimonthly') {
    if (!isWholeDay(r.second_day)) {
      throw new BillScheduleInputError('Second due day must be a whole number between 1 and 31')
    }
    if (r.day === r.second_day) {
      throw new BillScheduleInputError('The two due days must be different')
    }
  }
  if (r.frequency === 'annually') {
    if (r.month === undefined || !Number.isInteger(r.month) || r.month < 1 || r.month > 12) {
      throw new BillScheduleInputError('Due month must be a whole number between 1 and 12')
    }
  }
}

/** The two days in ascending order, so the alternation has a fixed direction. */
export function sortedDays(r: BillRecurrence): { day: number; second_day: number } {
  const a = r.day
  const b = r.second_day ?? r.day
  return a <= b ? { day: a, second_day: b } : { day: b, second_day: a }
}

/**
 * The earliest occurrence falling on or after `today`. This is the only payable
 * created when a bill is added: a bill created after this period's due day
 * starts at the next one.
 */
export function firstDueDate(r: BillRecurrence, today: string = isoDate()): string {
  validateRecurrence(r)
  const [y, m] = today.split('-').map(Number)

  if (r.frequency === 'annually') {
    const month = r.month as number
    const thisYear = dateOn(y, month, r.day)
    return thisYear >= today ? thisYear : dateOn(y + 1, month, r.day)
  }

  if (r.frequency === 'bimonthly') {
    const { day, second_day } = sortedDays(r)
    // Sorted because clamping can put the second-half day on or before the
    // first-half one — days 30 and 31 both land on Feb 28.
    const candidates = [dateOn(y, m, day), dateOn(y, m, second_day), dateOn(y, m + 1, day)].sort()
    // The last candidate is next month, so one of them is always on or after today.
    return candidates.find((d) => d >= today) as string
  }

  const thisMonth = dateOn(y, m, r.day)
  return thisMonth >= today ? thisMonth : dateOn(y, m + MONTH_STEP[r.frequency], r.day)
}

/**
 * The occurrence after `dueDate`. Derived from the recurrence's stored day, not
 * from `dueDate` itself — a monthly bill on the 31st that landed on Feb 28 must
 * return to Mar 31 rather than drift to the 28th for good.
 */
export function nextDueDate(r: BillRecurrence, dueDate: string): string {
  validateRecurrence(r)
  const [y, m] = dueDate.split('-').map(Number)

  if (r.frequency === 'bimonthly') {
    const { day, second_day } = sortedDays(r)
    const secondHalf = dateOn(y, m, second_day)
    // The comparison also covers the clamped case where both days collapse onto
    // one date: the candidate is not after dueDate, so the month rolls over
    // instead of emitting a duplicate.
    return secondHalf > dueDate ? secondHalf : dateOn(y, m + 1, day)
  }

  return dateOn(y, m + MONTH_STEP[r.frequency], r.day)
}
