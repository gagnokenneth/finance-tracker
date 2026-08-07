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

export const DUE_STATUS_LABEL: Record<DueStatus, string> = {
  late: 'Late',
  'due-soon': 'Due soon',
  upcoming: 'Upcoming',
}

/** Colour never carries meaning alone — always pair with DUE_STATUS_LABEL. */
export const DUE_STATUS_CLASS: Record<DueStatus, string> = {
  late: 'bg-red-50 text-red-700 ring-red-600/20',
  'due-soon': 'bg-amber-50 text-amber-700 ring-amber-600/20',
  upcoming: 'bg-slate-50 text-slate-600 ring-slate-500/20',
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
