import type { Note, NoteItem, NoteLinkType } from '../types.ts'

export const LINK_LABEL: Record<NoteLinkType, string> = {
  bill: 'Bill',
  debt: 'Debt',
  task: 'Task',
}

export function itemsFor(items: NoteItem[], noteId: number): NoteItem[] {
  return items.filter((i) => i.note_id === noteId).sort((a, b) => a.sort_order - b.sort_order)
}

/** One more than the highest sort_order already used by this note's items. */
export function nextSortOrder(items: NoteItem[], noteId: number): number {
  return Math.max(-1, ...items.filter((i) => i.note_id === noteId).map((i) => i.sort_order)) + 1
}

/** "3 of 5 done" — the compact summary the list page shows for a checklist note. */
export function doneCount(items: NoteItem[]): { done: number; total: number } {
  return { done: items.filter((i) => i.done).length, total: items.length }
}

/** A short, single-line preview of a freeform note's body for the list page. */
export function bodyPreview(note: Note): string {
  if (!note.body) return ''
  const oneLine = note.body.replace(/\s+/g, ' ').trim()
  return oneLine.length > 80 ? `${oneLine.slice(0, 80)}…` : oneLine
}
