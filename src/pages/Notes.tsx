import { useState } from 'react'
import { useFinanceData } from '../hooks/useFinanceData.ts'
import { itemsFor, doneCount, bodyPreview, LINK_LABEL } from '../lib/notes.ts'
import { isTemp } from '../lib/tempId.ts'
import { CardRow } from '../components/CardRow.tsx'
import { PendingBadge } from '../components/PendingBadge.tsx'
import { EmptyState } from '../components/EmptyState.tsx'
import { Button } from '../components/ui.tsx'
import { LoadError } from '../components/LoadError.tsx'
import { LoadingScreen } from '../components/LoadingScreen.tsx'
import { AddNoteModal } from './notes/AddNoteModal.tsx'

export function Notes() {
  const { data, isPending, isError, error } = useFinanceData()
  const [adding, setAdding] = useState(false)

  if (isPending) return <LoadingScreen />
  if (isError || !data) return <LoadError error={error} />

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Notes</h1>
        <Button type="button" onClick={() => setAdding(true)}>
          Add note
        </Button>
      </div>

      {data.notes.length === 0 ? (
        <EmptyState title="Nothing tracked yet">
          Jot down a freeform note, or start a checklist.
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {data.notes.map((note) => {
            const pending = isTemp(note.id)
            const summary =
              note.kind === 'checklist'
                ? (() => {
                    const { done, total } = doneCount(itemsFor(data.note_items, note.id))
                    return total === 0 ? 'No items yet' : `${done} of ${total} done`
                  })()
                : bodyPreview(note)
            return (
              <CardRow key={note.id} to={`/notes/${note.id}`} pending={pending}>
                <div className="flex items-start justify-between gap-4">
                  <span className="font-semibold tracking-tight text-ink">{note.title}</span>
                  {pending && <PendingBadge />}
                </div>
                {summary && <p className="mt-1 text-sm text-ink-soft">{summary}</p>}
                {note.linked_type && (
                  <p className="mt-2 text-xs font-semibold tracking-wide text-ink-faint uppercase">
                    Linked to {LINK_LABEL[note.linked_type]}
                  </p>
                )}
              </CardRow>
            )
          })}
        </div>
      )}

      {adding && <AddNoteModal open data={data} onClose={() => setAdding(false)} />}
    </div>
  )
}
