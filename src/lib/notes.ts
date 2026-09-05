import type { Note, NoteItem, NoteLinkType } from '../types.ts'

export const LINK_LABEL: Record<NoteLinkType, string> = {
  bill: 'Bill',
  debt: 'Debt',
  task: 'Task',
}

export function itemsFor(items: NoteItem[], noteId: number): NoteItem[] {
  return items.filter((i) => i.note_id === noteId).sort((a, b) => a.sort_order - b.sort_order)
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
