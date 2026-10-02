import { useState } from 'react'
import type { FormEvent } from 'react'
import { useFinanceMutations } from '../../hooks/useFinanceMutations.ts'
import {
  BrutalModal,
  BrutalField,
  BrutalInput,
  BrutalButton,
  BrutalSecondaryButton,
  BrutalModalBody,
  BrutalModalFooter,
} from '../../components/brutal.tsx'

/**
 * Creation is just Title — a note's body is written afterward via the
 * WYSIWYG editor on its detail page, and a checklist is added there too via
 * "Add checklist", not chosen upfront.
 */
export function AddNoteModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addNote } = useFinanceMutations()
  const [title, setTitle] = useState('')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return
    onClose()
    addNote.mutate({ title: trimmed })
  }

  return (
    <BrutalModal open={open} title="Add note" onClose={onClose}>
      <form onSubmit={submit}>
        <BrutalModalBody>
          <BrutalField label="Title" htmlFor="add-note-title" required>
            <BrutalInput id="add-note-title" required autoFocus value={title} onChange={(e) => setTitle(e.target.value)} />
          </BrutalField>
        </BrutalModalBody>

        <BrutalModalFooter>
          <BrutalSecondaryButton type="button" onClick={onClose}>
            Cancel
          </BrutalSecondaryButton>
          <BrutalButton type="submit">
            Add note
          </BrutalButton>
        </BrutalModalFooter>
      </form>
    </BrutalModal>
  )
}
