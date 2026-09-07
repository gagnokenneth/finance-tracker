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

export function daysInMonth(year: number, month: number): number {
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
 * `iso` shifted by `days` (negative shifts backward). Unlike dateOn, this never
 * clamps — it rolls into the next or previous month/year via the Date
 * constructor's own normalization, which is what plain day-counting (a
 * calendar grid's cells, a "N days from now" window) needs. dateOn's clamping
 * is deliberate for its own callers (a bill's day-of-month recurrence must
 * clamp Jan 31 -> Feb 28, not roll into March) — this is a different need,
 * not a replacement.
 */
export function shiftDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  return isoDate(new Date(y, m - 1, d + days))
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
 * inMonth filters through this rather than comparing date prefixes its own
 * way, and future modules like the eventual Dashboard should too.
 */
export function monthWindow(month: string): { start: string; end: string } {
  const [y, m] = month.split('-').map(Number)
  return { start: dateOn(y, m, 1), end: dateOn(y, m, 31) }
}

/**
 * Rows dated within a yyyy-mm, newest first. Generic because Income and
 * Savings both need exactly this and two copies would drift apart.
 */
export function inMonth<T extends { date: string }>(rows: T[], month: string): T[] {
  const { start, end } = monthWindow(month)
  return rows
    .filter((r) => r.date >= start && r.date <= end)
    .sort((a, b) => b.date.localeCompare(a.date))
}

/** The yyyy-mm n months away; n may be negative. */
export function addMonths(month: string, n: number): string {
  const [y, m] = month.split('-').map(Number)
  return monthKey(new Date(y, m - 1 + n, 1))
}

/**
 * The Monday on/before `iso` — this app's one definition of "start of week",
 * matching monthWindow's role for months. Used by the task board to group
 * dated tasks into weeks without a stored sprint entity.
 */
export function startOfWeek(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  // getDay(): 0=Sun..6=Sat. Distance back to Monday: Sunday is 6 days back,
  // any other day is (day - 1) days back.
  const day = date.getDay()
  const back = day === 0 ? 6 : day - 1
  return shiftDays(iso, -back)
}

/** Inclusive ISO bounds of the 7-day week starting at `weekStart` (a Monday). */
export function weekWindow(weekStart: string): { start: string; end: string } {
  return { start: weekStart, end: shiftDays(weekStart, 6) }
}

/** The Monday n weeks away from `weekStart`; n may be negative. */
export function addWeeks(weekStart: string, n: number): string {
  return shiftDays(weekStart, n * 7)
}
