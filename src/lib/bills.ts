import { nextUnpaid } from './debts.ts'
import { FREQUENCY_LABEL } from './billSchedule.ts'
import type { BillRecurrence } from './billSchedule.ts'
import type { Bill, BillPayable } from '../types.ts'

/**
 * Newest first, unlike a debt schedule. A debt reads as a countdown scanned top
 * to bottom; a bill has an unbounded history whose only actionable row is the
 * upcoming one, so it belongs at the top.
 */
export function payablesFor(rows: BillPayable[], billId: number): BillPayable[] {
  return rows
    .filter((r) => r.bill_id === billId)
    .sort((a, b) => b.due_date.localeCompare(a.due_date))
}

/** The one unpaid payable, or null once the bill is closed. */
export function upcomingPayable(rows: BillPayable[], billId: number): BillPayable | null {
  return nextUnpaid(payablesFor(rows, billId))
}

/** "Monthly · Fixed" — the caption under a bill's name. */
export function billCaption(bill: Bill): string {
  return `${FREQUENCY_LABEL[bill.frequency]} · ${bill.type === 'fixed' ? 'Fixed' : 'Variable'}`
}

/** Total still owed across every unpaid payable. Unpriced rows count as nothing. */
export function unpaidTotal(rows: BillPayable[]): number {
  return rows.filter((r) => !r.paid).reduce((sum, r) => sum + (r.amount ?? 0), 0)
}

/** The recurrence half of a bill, for the schedule functions. */
export function recurrenceOf(bill: Bill): BillRecurrence {
  return {
    frequency: bill.frequency,
    day: bill.day,
    second_day: bill.second_day,
    month: bill.month,
  }
}
