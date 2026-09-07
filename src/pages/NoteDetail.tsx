import { useState } from 'react'
import type { FormEvent } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useFinanceData } from '../hooks/useFinanceData.ts'
import { useFinanceMutations } from '../hooks/useFinanceMutations.ts'
import { itemsFor } from '../lib/notes.ts'
import { isTemp } from '../lib/tempId.ts'
import { Card } from '../components/Card.tsx'
import { RowButton, DeleteButton, TextInput } from '../components/ui.tsx'
import { RichTextEditor } from '../components/RichTextEditor.tsx'
import { PendingBadge } from '../components/PendingBadge.tsx'
import { ConfirmDialog } from '../components/ConfirmDialog.tsx'
import { LoadError } from '../components/LoadError.tsx'
import { LoadingScreen } from '../components/LoadingScreen.tsx'

export function NoteDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data, isPending, isError, error } = useFinanceData()
  const { updateNote, deleteNote, addNoteItem, updateNoteItem, deleteNoteItem } = useFinanceMutations()
  const [renaming, setRenaming] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [newItemText, setNewItemText] = useState('')
  // Opt-in for this session once "Add checklist" is clicked; once the note
  // actually has items, the section shows regardless (see showChecklist below).
  const [checklistOpen, setChecklistOpen] = useState(false)

  if (isPending) return <LoadingScreen />
  if (isError || !data) return <LoadError error={error} />

  const note = data.notes.find((n) => n.id === Number(id))
  if (!note) return <LoadError error={new Error('Note not found')} />

  const items = itemsFor(data.note_items, note.id)
  const pending = isTemp(note.id)
  const showChecklist = checklistOpen || items.length > 0

  const startRename = () => {
    if (pending) return
    setTitleDraft(note.title)
    setRenaming(true)
  }

  const saveRename = () => {
    setRenaming(false)
    const trimmed = titleDraft.trim()
    if (trimmed && trimmed !== note.title) {
      updateNote.mutate({ id: note.id, patch: { title: trimmed } })
    }
  }

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
        {renaming ? (
          <TextInput
            autoFocus
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={saveRename}
            onKeyDown={(e) => {
              // Blur (not a direct saveRename() call) so onBlur remains the
              // single place a save happens — calling both would unmount the
              // input mid-render and let the resulting native blur fire a
              // second, stale saveRename with the same patch.
              if (e.key === 'Enter') e.currentTarget.blur()
              if (e.key === 'Escape') setRenaming(false)
            }}
            className="!w-auto text-2xl font-semibold tracking-tight text-ink"
          />
        ) : (
          <h1
            className={`text-2xl font-semibold tracking-tight text-ink ${!pending ? 'cursor-text hover:underline' : ''}`}
            onClick={startRename}
          >
            {note.title}
          </h1>
        )}
        <DeleteButton type="button" onClick={() => setDeleting(true)} />
      </div>

      <Card>
        {pending ? (
          <p className="text-sm text-ink-faint">Saving…</p>
        ) : (
          <RichTextEditor
            value={note.body ?? ''}
            onChange={(html) => updateNote.mutate({ id: note.id, patch: { body: html || null } })}
          />
        )}
      </Card>

      {!pending && !showChecklist && (
        <RowButton onClick={() => setChecklistOpen(true)}>Add checklist</RowButton>
      )}

      {showChecklist && (
        <Card>
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
                  const itemPending = isTemp(item.id)
                  return (
                    <li key={item.id} className="flex items-center gap-3 py-2">
                      <input
                        type="checkbox"
                        checked={item.done}
                        disabled={itemPending}
                        onChange={(e) =>
                          updateNoteItem.mutate({ id: item.id, patch: { done: e.target.checked } })
                        }
                      />
                      <span className={`flex-1 text-sm ${item.done ? 'text-ink-faint line-through' : 'text-ink'}`}>
                        {item.text}
                      </span>
                      {itemPending ? (
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
        </Card>
      )}

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
