import { useState } from 'react'
import type { FormEvent } from 'react'
import { useFinanceMutations } from '../../hooks/useFinanceMutations.ts'
import { Modal } from '../../components/Modal.tsx'
import { Field, TextInput, Button, SecondaryButton } from '../../components/ui.tsx'

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
    <Modal open={open} title="Add note" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <Field label="Title" required>
          <TextInput required value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>

        <div className="mt-1 flex justify-end gap-2">
          <SecondaryButton type="button" onClick={onClose}>
            Cancel
          </SecondaryButton>
          <Button type="submit" disabled={!title.trim()}>
            Add note
          </Button>
        </div>
      </form>
    </Modal>
  )
}
