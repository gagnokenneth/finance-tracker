import { useState } from 'react'
import { useFinanceData } from '../hooks/useFinanceData.ts'
import { groupItemsByNote, doneCount, bodyPreview } from '../lib/notes.ts'
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

  const itemsByNote = groupItemsByNote(data.note_items)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Notes</h1>
        <Button type="button" onClick={() => setAdding(true)}>
          Add note
        </Button>
      </div>

      {data.notes.length === 0 ? (
        <EmptyState title="Nothing tracked yet">Jot down a note, or start a checklist on one.</EmptyState>
      ) : (
        <div className="space-y-3">
          {data.notes.map((note) => {
            const pending = isTemp(note.id)
            const preview = bodyPreview(note)
            const { done, total } = doneCount(itemsByNote.get(note.id) ?? [])
            return (
              <CardRow key={note.id} to={`/notes/${note.id}`} pending={pending}>
                <div className="flex items-start justify-between gap-4">
                  <span className="font-semibold tracking-tight text-ink">{note.title}</span>
                  {pending && <PendingBadge />}
                </div>
                {preview && <p className="mt-1 text-sm text-ink-soft">{preview}</p>}
                {total > 0 && (
                  <p className="mt-1 text-sm text-ink-soft">
                    {done} of {total} done
                  </p>
                )}
              </CardRow>
            )
          })}
        </div>
      )}

      {adding && <AddNoteModal open onClose={() => setAdding(false)} />}
    </div>
  )
}
