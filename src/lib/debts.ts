import { isoDate } from './currentMonth.ts'
import type { Debt, DebtScheduleRow, DebtStatement } from '../types.ts'

export type DueStatus = 'late' | 'due-soon' | 'upcoming'

/** Rows of either kind share the fields these helpers need. */
interface DueRow {
  due_date: string
  paid: boolean
}

const DUE_SOON_DAYS = 7

function daysBetween(from: string, to: string): number {
  const a = new Date(`${from}T00:00:00`).getTime()
  const b = new Date(`${to}T00:00:00`).getTime()
  return Math.round((b - a) / 86_400_000)
}

export function dueStatus(dueDate: string, today: string = isoDate()): DueStatus {
  const days = daysBetween(today, dueDate)
  if (days < 0) return 'late'
  if (days <= DUE_SOON_DAYS) return 'due-soon'
  return 'upcoming'
}

/** A row is either settled, or unpaid at some distance from its due date. */
export type RowStatus = DueStatus | 'paid'

export const ROW_STATUS_LABEL: Record<RowStatus, string> = {
  late: 'Late',
  'due-soon': 'Due soon',
  upcoming: 'Upcoming',
  paid: 'Paid',
}

/**
 * Graded by urgency: red → orange → yellow → green. Colour never carries
 * meaning alone — always pair with ROW_STATUS_LABEL.
 */
export const ROW_STATUS_CLASS: Record<RowStatus, string> = {
  late: 'bg-red-50 text-red-700 ring-red-600/20',
  'due-soon': 'bg-orange-50 text-orange-700 ring-orange-600/20',
  upcoming: 'bg-yellow-50 text-yellow-800 ring-yellow-600/20',
  paid: 'bg-green-50 text-green-700 ring-green-600/20',
}

/** Earliest unpaid row by due date, or null when everything is settled. */
export function nextUnpaid<T extends DueRow>(rows: T[]): T | null {
  const unpaid = rows.filter((r) => !r.paid)
  if (unpaid.length === 0) return null
  return unpaid.reduce((best, r) => (r.due_date < best.due_date ? r : best))
}

export function scheduleFor(rows: DebtScheduleRow[], debtId: number): DebtScheduleRow[] {
  return rows
    .filter((r) => r.debt_id === debtId)
    .sort((a, b) => a.due_date.localeCompare(b.due_date))
}

export function statementsFor(rows: DebtStatement[], debtId: number): DebtStatement[] {
  return rows
    .filter((r) => r.debt_id === debtId)
    .sort((a, b) => a.due_date.localeCompare(b.due_date))
}

/**
 * Remaining balance. For a fixed debt this is the sum of unpaid installments.
 * For a revolving debt it is the outstanding balance of the latest statement —
 * a card balance is not a sum of its statements.
 */
export function totalBalance(
  debt: Debt,
  schedule: DebtScheduleRow[],
  statements: DebtStatement[],
): number {
  if (debt.type === 'fixed') {
    return scheduleFor(schedule, debt.id)
      .filter((r) => !r.paid)
      .reduce((sum, r) => sum + r.amount, 0)
  }
  const rows = statementsFor(statements, debt.id)
  if (rows.length === 0) return 0
  return rows[rows.length - 1].outstanding
}

/** Next unpaid due date across whichever table this debt uses. */
export function nextDueDate(
  debt: Debt,
  schedule: DebtScheduleRow[],
  statements: DebtStatement[],
): string | null {
  const rows: DueRow[] =
    debt.type === 'fixed' ? scheduleFor(schedule, debt.id) : statementsFor(statements, debt.id)
  return nextUnpaid(rows)?.due_date ?? null
}
