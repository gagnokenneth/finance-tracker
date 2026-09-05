import { useState } from 'react'
import type { FormEvent } from 'react'
import { useFinanceMutations } from '../../hooks/useFinanceMutations.ts'
import { referenceable } from '../../lib/tempId.ts'
import { LINK_LABEL } from '../../lib/notes.ts'
import { Modal } from '../../components/Modal.tsx'
import { Field, TextInput, SelectInput, Button, SecondaryButton } from '../../components/ui.tsx'
import type { FinanceData, Note, NoteLinkType } from '../../types.ts'

/** `data` is a prop from the parent page — see AddNoteModal's own note on this. */
export function EditNoteModal({
  open,
  note,
  data,
  onClose,
}: {
  open: boolean
  note: Note
  data: FinanceData
  onClose: () => void
}) {
  const { updateNote } = useFinanceMutations()
  const [title, setTitle] = useState(note.title)
  const [body, setBody] = useState(note.body ?? '')
  const [linkedType, setLinkedType] = useState<NoteLinkType | ''>(note.linked_type ?? '')
  const [linkedId, setLinkedId] = useState<number | ''>(note.linked_id ?? '')

  const bills = referenceable(data.bills)
  const debts = referenceable(data.debts)
  const tasks = referenceable(data.tasks.filter((t) => !t.completed))
  const linkOptions =
    linkedType === 'bill' ? bills : linkedType === 'debt' ? debts : linkedType === 'task' ? tasks : []

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return
    onClose()
    // null clears an optional field on the wire — undefined would be dropped
    // by JSON.stringify and the backend would keep the old value. See
    // NotePatch in FinanceApi.ts.
    updateNote.mutate({
      id: note.id,
      patch: {
        title: trimmed,
        body: note.kind === 'freeform' ? body.trim() || null : undefined,
        linked_type: linkedType || null,
        linked_id: linkedType && linkedId !== '' ? linkedId : null,
      },
    })
  }

  return (
    <Modal open={open} title="Edit note" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <Field label="Title">
          <TextInput required value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        {note.kind === 'freeform' && (
          <Field label="Notes">
            <TextInput value={body} onChange={(e) => setBody(e.target.value)} />
          </Field>
        )}
        <Field label="Link to (optional)">
          <SelectInput
            value={linkedType}
            onChange={(e) => {
              setLinkedType(e.target.value as NoteLinkType | '')
              setLinkedId('')
            }}
          >
            <option value="">Nothing</option>
            {(Object.keys(LINK_LABEL) as NoteLinkType[]).map((t) => (
              <option key={t} value={t}>
                {LINK_LABEL[t]}
              </option>
            ))}
          </SelectInput>
        </Field>
        {linkedType && (
          <Field label={LINK_LABEL[linkedType]}>
            <SelectInput
              required
              value={linkedId}
              onChange={(e) => setLinkedId(e.target.value ? Number(e.target.value) : '')}
            >
              <option value="">Select…</option>
              {linkOptions.map((row) => (
                <option key={row.id} value={row.id}>
                  {'name' in row ? row.name : row.title}
                </option>
              ))}
            </SelectInput>
          </Field>
        )}

        <div className="mt-1 flex justify-end gap-2">
          <SecondaryButton type="button" onClick={onClose}>
            Cancel
          </SecondaryButton>
          <Button type="submit" disabled={!title.trim() || (linkedType !== '' && linkedId === '')}>
            Save
          </Button>
        </div>
      </form>
    </Modal>
  )
}
