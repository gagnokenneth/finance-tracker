import type { TaskColumn } from '../types.ts'

/**
 * Seeded once per user the first time their task_columns sheet/rows are
 * empty — see the self-heal step in MockApi.ts's load() and Code.gs's
 * getAll(). Both backends must create exactly these three, in this order,
 * with these sort_order values, since nothing else assigns column_id on
 * first read.
 */
export const DEFAULT_TASK_COLUMNS: Array<Pick<TaskColumn, 'name' | 'sort_order' | 'is_done'>> = [
  { name: 'To Do', sort_order: 0, is_done: false },
  { name: 'In Progress', sort_order: 1, is_done: false },
  { name: 'Done', sort_order: 2, is_done: true },
]

export function sortedColumns(columns: TaskColumn[]): TaskColumn[] {
  return [...columns].sort((a, b) => a.sort_order - b.sort_order)
}

/** Throws if the invariant (exactly one is_done column) is somehow violated —
 *  a bug in the seeding/enforcement code, never a normal user state. */
export function doneColumn(columns: TaskColumn[]): TaskColumn {
  const done = columns.find((c) => c.is_done)
  if (!done) throw new Error('No done column — task_columns is missing its is_done row.')
  return done
}

/** The column a new task defaults into — whichever sorts first, so
 *  reordering columns doesn't leave new tasks landing somewhere odd. */
export function firstColumn(columns: TaskColumn[]): TaskColumn {
  const sorted = sortedColumns(columns)
  if (sorted.length === 0) throw new Error('No columns — task_columns is empty.')
  return sorted[0]
}

/** One more than the highest sort_order already used — where a newly added
 *  column is appended. Mirrors nextSortOrder in lib/notes.ts. */
export function nextSortOrder(columns: TaskColumn[]): number {
  return Math.max(-1, ...columns.map((c) => c.sort_order)) + 1
}
