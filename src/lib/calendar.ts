import { dueStatus } from './debts.ts'
import type { RowStatus } from './debts.ts'
import { sourceName } from './income.ts'
import type { FinanceData } from '../types.ts'

export type CalendarSource = 'bill' | 'debt' | 'income' | 'savings'

/**
 * One dated row from any module, flattened to what the calendar needs to
 * show and link to. Never carries an amount or any other module-specific
 * detail — that is one click away via `to`. Not a data-owning type: nothing
 * here is stored, it is computed fresh from FinanceData every call.
 */
export interface CalendarEvent {
  id: number
  source: CalendarSource
  label: string
  date: string
  to: string
  /** True only once Tasks exist (a later ticket) — everything today routes
   *  to its own page instead of being edited inline on the calendar. */
  editable: boolean
  /** Undefined for income/savings, which have no due-or-paid concept. */
  status?: RowStatus
}

/** The calendar's own color vocabulary for a status dot — small and
 *  separate from ROW_STATUS_CLASS (a full badge treatment) rather than
 *  parsing that string apart to pull one color out of it. */
export const STATUS_DOT: Record<RowStatus, string> = {
  late: 'bg-overdue',
  'due-soon': 'bg-soon',
  upcoming: 'bg-ink-faint',
  paid: 'bg-settled',
}

function inRange(date: string, start: string, end: string): boolean {
  return date >= start && date <= end
}

function billEvents(data: FinanceData, start: string, end: string): CalendarEvent[] {
  const events: CalendarEvent[] = []
  for (const payable of data.bill_payables) {
    if (!inRange(payable.due_date, start, end)) continue
    const bill = data.bills.find((b) => b.id === payable.bill_id)
    events.push({
      id: payable.id,
      source: 'bill',
      label: bill?.name ?? 'Bill',
      date: payable.due_date,
      to: `/bills/${payable.bill_id}`,
      editable: false,
      status: payable.paid ? 'paid' : dueStatus(payable.due_date),
    })
  }
  return events
}

function debtEvents(data: FinanceData, start: string, end: string): CalendarEvent[] {
  const events: CalendarEvent[] = []
  for (const row of data.debt_schedule) {
    if (!inRange(row.due_date, start, end)) continue
    const debt = data.debts.find((d) => d.id === row.debt_id)
    events.push({
      id: row.id,
      source: 'debt',
      label: debt?.name ?? 'Debt',
      date: row.due_date,
      to: `/debts/${row.debt_id}`,
      editable: false,
      status: row.paid ? 'paid' : dueStatus(row.due_date),
    })
  }
  for (const row of data.debt_statements) {
    if (!inRange(row.due_date, start, end)) continue
    const debt = data.debts.find((d) => d.id === row.debt_id)
    events.push({
      id: row.id,
      source: 'debt',
      label: debt?.name ?? 'Debt',
      date: row.due_date,
      to: `/debts/${row.debt_id}`,
      editable: false,
      status: row.paid ? 'paid' : dueStatus(row.due_date),
    })
  }
  return events
}

function incomeEvents(data: FinanceData, start: string, end: string): CalendarEvent[] {
  return data.income
    .filter((row) => inRange(row.date, start, end))
    .map((row) => ({
      id: row.id,
      source: 'income' as const,
      label: sourceName(data.income_sources, row.source_id),
      date: row.date,
      to: '/income',
      editable: false,
    }))
}

function savingsEvents(data: FinanceData, start: string, end: string): CalendarEvent[] {
  return data.savings_ledger
    .filter((row) => inRange(row.date, start, end))
    .map((row) => ({
      id: row.id,
      source: 'savings' as const,
      label: row.kind === 'deposit' ? 'Deposit' : row.kind === 'withdrawal' ? 'Withdrawal' : 'Payment',
      date: row.date,
      to: '/savings',
      editable: false,
    }))
}

/**
 * Every dated row from Bills, Debts, Income and Savings whose date falls
 * within [start, end] (inclusive, both ISO yyyy-mm-dd). Tasks and Goals are
 * not sources here yet — they don't exist until their own tickets ship;
 * adding them later means adding one more `xEvents` function and one more
 * spread below, not touching this function's signature.
 */
export function eventsInRange(data: FinanceData, start: string, end: string): CalendarEvent[] {
  return [
    ...billEvents(data, start, end),
    ...debtEvents(data, start, end),
    ...incomeEvents(data, start, end),
    ...savingsEvents(data, start, end),
  ]
}
