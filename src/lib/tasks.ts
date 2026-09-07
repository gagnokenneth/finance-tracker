import { shiftDays, nextMonthOn } from './currentMonth.ts'
import type { Task, TaskRecurrence } from '../types.ts'

/**
 * The date a completed recurring task's successor should carry. Computed
 * client-side and sent as moveTask's next_date — Code.gs and MockApi
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

/** Soonest-first; undated (Backlog) tasks sort after every dated one. */
export function tasksSorted(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => (a.date ?? '9999-99-99').localeCompare(b.date ?? '9999-99-99'))
}
