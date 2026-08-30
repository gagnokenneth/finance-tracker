import { dueStatus, nextUnpaid, scheduleFor, statementsFor } from './debts.ts'
import { upcomingPayable } from './bills.ts'
import type { FinanceData } from '../types.ts'

export type DueKind = 'bill' | 'debt'

/** One unpaid item at least due-soon: a bill's upcoming payable, or a debt's next installment. */
export interface DueItem {
  id: number
  kind: DueKind
  label: string
  to: string
  dueDate: string
  /** Undefined for a variable bill payable or an unpriced statement — no figure to show. */
  amount?: number
  status: 'late' | 'due-soon'
}

function billDueItems(data: FinanceData): DueItem[] {
  const items: DueItem[] = []
  for (const bill of data.bills) {
    if (bill.closed) continue
    const payable = upcomingPayable(data.bill_payables, bill.id)
    if (!payable) continue
    const status = dueStatus(payable.due_date)
    if (status === 'upcoming') continue
    items.push({
      id: bill.id,
      kind: 'bill',
      label: bill.name,
      to: `/bills/${bill.id}`,
      dueDate: payable.due_date,
      amount: payable.amount,
      status,
    })
  }
  return items
}

/*
 * A fixed row and a statement carry their amount under different names
 * (amount vs total_due), so each is handled in its own branch rather than
 * through a shared DueRow view that would erase the field.
 */
function debtDueItems(data: FinanceData): DueItem[] {
  const items: DueItem[] = []
  for (const debt of data.debts) {
    if (debt.type === 'fixed') {
      const row = nextUnpaid(scheduleFor(data.debt_schedule, debt.id))
      if (!row) continue
      const status = dueStatus(row.due_date)
      if (status === 'upcoming') continue
      items.push({
        id: debt.id,
        kind: 'debt',
        label: debt.name,
        to: `/debts/${debt.id}`,
        dueDate: row.due_date,
        amount: row.amount,
        status,
      })
    } else {
      const row = nextUnpaid(statementsFor(data.debt_statements, debt.id))
      if (!row) continue
      const status = dueStatus(row.due_date)
      if (status === 'upcoming') continue
      items.push({
        id: debt.id,
        kind: 'debt',
        label: debt.name,
        to: `/debts/${debt.id}`,
        dueDate: row.due_date,
        amount: row.total_due,
        status,
      })
    }
  }
  return items
}

function byDueDate(a: DueItem, b: DueItem): number {
  return a.dueDate.localeCompare(b.dueDate)
}

/**
 * Everything at least due-soon, bucketed by status. 'upcoming' items (more than
 * DUE_SOON_DAYS away) are not the dashboard's concern — Bills and Debts already
 * show those.
 */
export function duePages(data: FinanceData): { late: DueItem[]; dueSoon: DueItem[] } {
  const items = [...billDueItems(data), ...debtDueItems(data)]
  return {
    late: items.filter((i) => i.status === 'late').sort(byDueDate),
    dueSoon: items.filter((i) => i.status === 'due-soon').sort(byDueDate),
  }
}
