import { useState } from 'react'
import type { FormEvent } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useFinanceData } from '../hooks/useFinanceData.ts'
import { useFinanceMutations } from '../hooks/useFinanceMutations.ts'
import { useInlineRename } from '../hooks/useInlineRename.ts'
import { itemsFor } from '../lib/notes.ts'
import { isTemp } from '../lib/tempId.ts'
import { RichTextEditor } from '../components/RichTextEditor.tsx'
import { brutalPageEditorLook } from '../components/brutalEditorLook.ts'
import { DeleteIcon } from '../components/icons.tsx'
import { PendingBadge } from '../components/PendingBadge.tsx'
import {
  BrutalButton,
  BrutalConfirm,
  BrutalIconButton,
  BrutalInput,
  BrutalSecondaryButton,
  checkboxClass,
  detailTitleClass,
  inlineEditClass,
  panelClass,
  smallButtonClass,
} from '../components/brutal.tsx'
import { LoadError } from '../components/LoadError.tsx'
import { LoadingScreen } from '../components/LoadingScreen.tsx'

export function NoteDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data, isPending, isError, error } = useFinanceData()
  const { updateNote, deleteNote, addNoteItem, updateNoteItem, deleteNoteItem } = useFinanceMutations()
  const note = data?.notes.find((n) => n.id === Number(id))
  const rename = useInlineRename(note?.title ?? '', (trimmed) => {
    if (note) updateNote.mutate({ id: note.id, patch: { title: trimmed } })
  })
  const [deleting, setDeleting] = useState(false)
  const [newItemText, setNewItemText] = useState('')
  // Opt-in for this session once "Add checklist" is clicked; once the note
  // actually has items, the section shows regardless (see showChecklist below).
  const [checklistOpen, setChecklistOpen] = useState(false)

  if (isPending) return <LoadingScreen />
  if (isError || !data) return <LoadError error={error} />
  if (!note) return <LoadError error={new Error('Note not found')} />

  const items = itemsFor(data.note_items, note.id)
  const pending = isTemp(note.id)
  const showChecklist = checklistOpen || items.length > 0

  const addItem = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = newItemText.trim()
    if (!trimmed) return
    setNewItemText('')
    addNoteItem.mutate({ noteId: note.id, input: { text: trimmed } })
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        {rename.renaming ? (
          <input
            autoFocus
            aria-label="Note title"
            value={rename.draft}
            onChange={(e) => rename.setDraft(e.target.value)}
            onBlur={rename.save}
            onKeyDown={rename.onKeyDown}
            className={`${detailTitleClass} ${inlineEditClass} min-w-0 flex-1 px-2`}
          />
        ) : (
          <h1
            className={`${detailTitleClass} min-w-0 truncate ${!pending ? 'cursor-text hover:underline' : ''}`}
            onClick={() => !pending && rename.start()}
          >
            {note.title}
          </h1>
        )}
        <BrutalIconButton label="Delete note" onClick={() => setDeleting(true)}>
          <DeleteIcon className="size-4" />
        </BrutalIconButton>
      </div>

      {pending ? (
        <p className={`${panelClass} p-4 font-mono text-xs text-neutral-500`}>Saving…</p>
      ) : (
        <RichTextEditor
          look={brutalPageEditorLook}
          value={note.body ?? ''}
          onChange={(html) => updateNote.mutate({ id: note.id, patch: { body: html || null } })}
        />
      )}

      {!pending && !showChecklist && (
        <BrutalSecondaryButton type="button" className="shadow-hard-xs" onClick={() => setChecklistOpen(true)}>
          + Add checklist
        </BrutalSecondaryButton>
      )}

      {showChecklist && (
        <div className={`${panelClass} space-y-4 p-6`}>
          <form onSubmit={addItem} className="flex items-stretch gap-3">
            <BrutalInput
              aria-label="New checklist item"
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              placeholder="Add an item…"
              className="min-w-0 flex-1 placeholder:text-neutral-500"
            />
            <BrutalButton type="submit">
              Add
            </BrutalButton>
          </form>
          {items.length === 0 ? (
            <p className="font-mono text-xs text-neutral-500">No items yet.</p>
          ) : (
            <ul className="divide-y divide-black border-y border-black">
              {items.map((item) => {
                const itemPending = isTemp(item.id)
                return (
                  <li key={item.id} className="flex items-center gap-3 py-3">
                    <input
                      type="checkbox"
                      aria-label={item.text}
                      className={checkboxClass}
                      checked={item.done}
                      disabled={itemPending}
                      onChange={(e) => updateNoteItem.mutate({ id: item.id, patch: { done: e.target.checked } })}
                    />
                    <span className={`flex-1 font-mono text-sm ${item.done ? 'text-neutral-400 line-through' : 'text-black'}`}>
                      {item.text}
                    </span>
                    {itemPending ? (
                      <PendingBadge />
                    ) : (
                      <button type="button" className={smallButtonClass} onClick={() => deleteNoteItem.mutate(item.id)}>
                        Remove
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}

      <BrutalConfirm
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
