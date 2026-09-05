import { useState } from 'react'
import type { FormEvent } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useFinanceData } from '../hooks/useFinanceData.ts'
import { useFinanceMutations } from '../hooks/useFinanceMutations.ts'
import { itemsFor, LINK_LABEL } from '../lib/notes.ts'
import { isTemp } from '../lib/tempId.ts'
import { Card } from '../components/Card.tsx'
import { RowButton, SecondaryButton, TextInput } from '../components/ui.tsx'
import { PendingBadge } from '../components/PendingBadge.tsx'
import { ConfirmDialog } from '../components/ConfirmDialog.tsx'
import { LoadError } from '../components/LoadError.tsx'
import { LoadingScreen } from '../components/LoadingScreen.tsx'
import { EditNoteModal } from './notes/EditNoteModal.tsx'

export function NoteDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data, isPending, isError, error } = useFinanceData()
  const { deleteNote, addNoteItem, updateNoteItem, deleteNoteItem } = useFinanceMutations()
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [newItemText, setNewItemText] = useState('')

  if (isPending) return <LoadingScreen />
  if (isError || !data) return <LoadError error={error} />

  const note = data.notes.find((n) => n.id === Number(id))
  if (!note) return <LoadError error={new Error('Note not found')} />

  const items = note.kind === 'checklist' ? itemsFor(data.note_items, note.id) : []

  const addItem = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = newItemText.trim()
    if (!trimmed) return
    setNewItemText('')
    addNoteItem.mutate({ noteId: note.id, input: { text: trimmed } })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">{note.title}</h1>
          {note.linked_type && (
            <p className="mt-1 text-sm text-ink-soft">Linked to {LINK_LABEL[note.linked_type]}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <SecondaryButton type="button" onClick={() => setEditing(true)}>
            Edit
          </SecondaryButton>
          <SecondaryButton type="button" onClick={() => setDeleting(true)}>
            Delete
          </SecondaryButton>
        </div>
      </div>

      <Card>
        {note.kind === 'freeform' ? (
          <p className="text-sm whitespace-pre-wrap text-ink">
            {note.body || <span className="text-ink-faint">No notes yet.</span>}
          </p>
        ) : (
          <div className="space-y-3">
            <form onSubmit={addItem} className="flex items-center gap-2">
              <TextInput
                value={newItemText}
                onChange={(e) => setNewItemText(e.target.value)}
                placeholder="Add an item…"
              />
              <RowButton type="submit" tone="primary">
                Add
              </RowButton>
            </form>
            {items.length === 0 ? (
              <p className="text-sm text-ink-faint">No items yet.</p>
            ) : (
              <ul className="divide-y divide-edge">
                {items.map((item) => {
                  const pending = isTemp(item.id)
                  return (
                    <li key={item.id} className="flex items-center gap-3 py-2">
                      <input
                        type="checkbox"
                        checked={item.done}
                        disabled={pending}
                        onChange={(e) =>
                          updateNoteItem.mutate({ id: item.id, patch: { done: e.target.checked } })
                        }
                      />
                      <span className={`flex-1 text-sm ${item.done ? 'text-ink-faint line-through' : 'text-ink'}`}>
                        {item.text}
                      </span>
                      {pending ? (
                        <PendingBadge />
                      ) : (
                        <RowButton tone="danger" onClick={() => deleteNoteItem.mutate(item.id)}>
                          Remove
                        </RowButton>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )}
      </Card>

      {editing && <EditNoteModal open note={note} data={data} onClose={() => setEditing(false)} />}

      <ConfirmDialog
        open={deleting}
        title="Delete note"
        message={`Delete "${note.title}"? This cannot be undone.`}
        confirmLabel="Delete note"
        onConfirm={() => {
          // Leaving first is safe: the note is already gone from the cached
          // list this navigates to, and a failure restores it and raises a
          // toast — matching BillDetail's own delete-and-leave pattern.
          setDeleting(false)
          void navigate('/notes')
          deleteNote.mutate(note.id)
        }}
        onClose={() => setDeleting(false)}
      />
    </div>
  )
}
