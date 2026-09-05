import { shiftDays, nextMonthOn } from './currentMonth.ts'
import type { Task, TaskRecurrence } from '../types.ts'

/**
 * The date a completed recurring task's successor should carry. Computed
 * client-side and sent as completeTask's next_date — Code.gs and MockApi
 * never run this arithmetic themselves, the same split Bills already use
 * for first_due_date/next_due_date.
 */
export function nextTaskDate(date: string, recurrence: TaskRecurrence): string {
  if (recurrence === 'daily') return shiftDays(date, 1)
  if (recurrence === 'weekly') return shiftDays(date, 7)
  return nextMonthOn(date) // 'monthly'
}

export const RECURRENCES: TaskRecurrence[] = ['daily', 'weekly', 'monthly']

export const RECURRENCE_LABEL: Record<TaskRecurrence, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
}

/** Newest-scheduled-first is wrong for a todo list — soonest first is the
 *  actionable order, matching how Bills' schedule table already sorts. */
export function tasksSorted(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => a.date.localeCompare(b.date))
}
