import { shiftDays, nextMonthOn, weekWindow, isoDate } from './currentMonth.ts'
import type { Task, TaskRecurrence, TaskColumn } from '../types.ts'
import type { MoveTaskInput } from '../api/FinanceApi.ts'

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

/**
 * Builds the moveTask input for dropping/moving a task into `columnId`.
 * Landing in the done column stamps completed_date and, for a dated
 * recurring task, mints the next occurrence's date. Shared by the board's
 * drag-and-drop handler and the detail popup's "Move to" buttons.
 */
/**
 * `dateOverride` is set when dropping a Backlog (undated) task onto the
 * board — the drop target's column, but no drop target knows what date to
 * assign, so the caller supplies the week currently on screen. A task
 * already on the board (already dated) keeps its own date; only a Backlog
 * task's drop needs one assigned.
 */
export function buildMoveInput(
  task: Task,
  columnId: number,
  doneColumnId: number,
  dateOverride?: string,
): MoveTaskInput {
  const effectiveDate = dateOverride ?? task.date
  if (columnId === doneColumnId) {
    return {
      column_id: columnId,
      date: dateOverride,
      completed_date: isoDate(),
      next_date: effectiveDate && task.recurrence ? nextTaskDate(effectiveDate, task.recurrence) : undefined,
    }
  }
  return { column_id: columnId, date: dateOverride }
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

/** Every task with no date — the Backlog. */
export function backlogTasks(tasks: Task[]): Task[] {
  return tasks.filter((t) => t.date === undefined)
}

/** Every dated task falling inside the 7-day week starting at weekStart. */
export function tasksInWeek(tasks: Task[], weekStart: string): Task[] {
  const { start, end } = weekWindow(weekStart)
  return tasks.filter((t) => t.date !== undefined && t.date >= start && t.date <= end)
}

/** Groups tasks by column_id, in the column list's own sort order. */
export function groupByColumn(tasks: Task[], columns: TaskColumn[]): Map<number, Task[]> {
  const groups = new Map<number, Task[]>(columns.map((c) => [c.id, []]))
  for (const task of tasks) {
    const group = groups.get(task.column_id)
    if (group) group.push(task)
  }
  return groups
}

/** Groups tasks by their date (yyyy-mm-dd) — for sub-heading a column's
 *  cards by day inside "This week". Only meaningful for dated tasks. */
export function groupByDay(tasks: Task[]): Map<string, Task[]> {
  const groups = new Map<string, Task[]>()
  for (const task of tasks) {
    if (task.date === undefined) continue
    const group = groups.get(task.date)
    if (group) group.push(task)
    else groups.set(task.date, [task])
  }
  return groups
}
