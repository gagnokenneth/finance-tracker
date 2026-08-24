/** Returns the yyyy-mm string for the given date (defaults to now). */
export function monthKey(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

/** Returns the local yyyy-mm-dd string for the given date (defaults to now). */
export function isoDate(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

/**
 * An ISO date for the given day of the given month, clamped to that month's
 * length: a date on the 31st falls on Feb 28, or Feb 29 in a leap year.
 * `month` is 1-12 and may overflow — 13 rolls into the next January.
 */
export function dateOn(year: number, month: number, day: number): string {
  const y = year + Math.floor((month - 1) / 12)
  const m = ((((month - 1) % 12) + 12) % 12) + 1
  return isoDate(new Date(y, m - 1, Math.min(day, daysInMonth(y, m))))
}

/**
 * The same day of the following month, clamped. A statement due Jan 31 puts
 * the next one on Feb 28 — and, having lost the 31st, keeps it on the 28th
 * after that. A card's statement day drifts the same way when a month is
 * short, and the user can edit the date if theirs does not.
 */
export function nextMonthOn(date: string): string {
  const [year, month, day] = date.split('-').map(Number)
  return dateOn(year, month + 1, day)
}

/**
 * Inclusive ISO bounds of a yyyy-mm. The one definition of "this month" —
 * FT-5's allocation periods and FT-7's dashboard both filter through this
 * rather than comparing date prefixes their own way.
 */
export function monthWindow(month: string): { start: string; end: string } {
  const [y, m] = month.split('-').map(Number)
  return { start: dateOn(y, m, 1), end: dateOn(y, m, 31) }
}

/** The yyyy-mm n months away; n may be negative. */
export function addMonths(month: string, n: number): string {
  const [y, m] = month.split('-').map(Number)
  return monthKey(new Date(y, m - 1 + n, 1))
}
