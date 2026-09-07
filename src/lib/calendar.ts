import { dueStatus } from './debts.ts'
import type { RowStatus } from './debts.ts'
import { sourceName } from './income.ts'
import { doneColumn } from './taskColumns.ts'
import type { FinanceData, Goal, Task } from '../types.ts'

export type CalendarSource = 'bill' | 'debt' | 'income' | 'savings' | 'task' | 'goal'

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
  /** True for task events. Not currently read anywhere: every event,
   *  editable or not, still just navigates via `to` — there is no inline
   *  editor on the calendar for anything. Kept for a future ticket that
   *  might want to distinguish them (e.g. an inline quick-toggle). */
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
 * Tasks are the calendar's one editable source — see the interaction model
 * in the design spec: editing still routes to the Tasks page (there is no
 * inline editor here either), but a task is the one thing the calendar can
 * CREATE directly, via Calendar.tsx's own "+" affordance.
 */
function taskEvents(data: FinanceData, start: string, end: string): CalendarEvent[] {
  return data.tasks
    .filter((row): row is Task & { date: string } => row.date !== undefined)
    .filter((row) => inRange(row.date, start, end))
    .map((row) => ({
      id: row.id,
      source: 'task' as const,
      label: row.title,
      date: row.date,
      to: '/tasks',
      editable: true,
      status: row.column_id === doneColumn(data.task_columns).id ? ('paid' as const) : dueStatus(row.date),
    }))
}

/**
 * Goal and subgoal target dates, read-only markers exactly like every other
 * non-Task source — editing a goal's date happens on the Goals page, never
 * inline on the calendar. A goal with no target_date is not an event at all.
 */
function goalEvents(data: FinanceData, start: string, end: string): CalendarEvent[] {
  return data.goals
    .filter((g): g is Goal & { target_date: string } => g.target_date !== undefined)
    .filter((g) => g.status !== 'abandoned')
    .filter((g) => inRange(g.target_date, start, end))
    .map((g) => ({
      id: g.id,
      source: 'goal' as const,
      label: g.title,
      date: g.target_date,
      to: `/goals/${g.id}`,
      editable: false,
      status: g.status === 'achieved' ? ('paid' as const) : g.status === 'not_achieved' ? ('late' as const) : undefined,
    }))
}

/**
 * Every dated row from Bills, Debts, Income, Savings, Tasks and Goals whose
 * date falls within [start, end] (inclusive, both ISO yyyy-mm-dd). This is
 * the calendar's full source list — all four modules the design spec named.
 */
export function eventsInRange(data: FinanceData, start: string, end: string): CalendarEvent[] {
  return [
    ...billEvents(data, start, end),
    ...debtEvents(data, start, end),
    ...incomeEvents(data, start, end),
    ...savingsEvents(data, start, end),
    ...taskEvents(data, start, end),
    ...goalEvents(data, start, end),
  ]
}
