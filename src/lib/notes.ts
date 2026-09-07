import type { Note, NoteItem } from '../types.ts'

export function itemsFor(items: NoteItem[], noteId: number): NoteItem[] {
  return items.filter((i) => i.note_id === noteId).sort((a, b) => a.sort_order - b.sort_order)
}

/**
 * Every note's items, grouped in one pass — for a list rendering every note's
 * checklist summary, this is one O(items) scan instead of one O(items) scan
 * per note (itemsFor re-filters the whole array each time it's called).
 */
export function groupItemsByNote(items: NoteItem[]): Map<number, NoteItem[]> {
  const byNote = new Map<number, NoteItem[]>()
  for (const item of items) {
    const group = byNote.get(item.note_id)
    if (group) group.push(item)
    else byNote.set(item.note_id, [item])
  }
  for (const group of byNote.values()) group.sort((a, b) => a.sort_order - b.sort_order)
  return byNote
}

/** One more than the highest sort_order already used by this note's items. */
export function nextSortOrder(items: NoteItem[], noteId: number): number {
  return Math.max(-1, ...items.filter((i) => i.note_id === noteId).map((i) => i.sort_order)) + 1
}

/** "3 of 5 done" — the compact summary the list page shows for a checklist note. */
export function doneCount(items: NoteItem[]): { done: number; total: number } {
  return { done: items.filter((i) => i.done).length, total: items.length }
}

/**
 * A short, single-line preview of a freeform note's body for the list page.
 * body is the WYSIWYG editor's HTML — tags are stripped for this plain-text
 * summary.
 */
export function bodyPreview(note: Note): string {
  if (!note.body) return ''
  const text = note.body.replace(/<[^>]+>/g, ' ')
  const oneLine = text.replace(/\s+/g, ' ').trim()
  return oneLine.length > 80 ? `${oneLine.slice(0, 80)}…` : oneLine
}
