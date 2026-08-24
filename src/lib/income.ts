import { monthWindow } from './currentMonth.ts'
import { isTemp } from './tempId.ts'
import type { IncomeEntry, IncomeSource } from '../types.ts'

/** Entries dated within a yyyy-mm, newest first. */
export function entriesInMonth(rows: IncomeEntry[], month: string): IncomeEntry[] {
  const { start, end } = monthWindow(month)
  return rows
    .filter((r) => r.date >= start && r.date <= end)
    .sort((a, b) => b.date.localeCompare(a.date))
}

export function monthTotal(rows: IncomeEntry[]): number {
  return rows.reduce((sum, r) => sum + r.amount, 0)
}

/**
 * A source's name, archived or not. Only the picker filters on archived; an
 * entry whose source was archived must still render a name rather than a gap.
 */
export function sourceName(sources: IncomeSource[], id: number): string {
  return sources.find((s) => s.id === id)?.name ?? 'Unknown source'
}

/**
 * Sources offerable in a picker: not archived, and not still being written.
 * A temp id is negative (lib/tempId.ts) and no backend can resolve it, so an
 * entry saved against one would ship a dangling reference.
 */
export function activeSources(sources: IncomeSource[]): IncomeSource[] {
  return sources.filter((s) => !s.archived && !isTemp(s.id))
}

/** How many entries use each source id, for the delete-or-archive decision. */
export function sourceUsage(rows: IncomeEntry[]): Map<number, number> {
  const counts = new Map<number, number>()
  for (const row of rows) counts.set(row.source_id, (counts.get(row.source_id) ?? 0) + 1)
  return counts
}
