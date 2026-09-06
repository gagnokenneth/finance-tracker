import { useState } from 'react'
import type { FormEvent } from 'react'
import { useFinanceMutations } from '../../hooks/useFinanceMutations.ts'
import { referenceable } from '../../lib/tempId.ts'
import { LINK_LABEL } from '../../lib/notes.ts'
import { Modal } from '../../components/Modal.tsx'
import { Field, TextInput, SelectInput, Button, SecondaryButton } from '../../components/ui.tsx'
import { LinkPickerFields } from '../../components/LinkPickerFields.tsx'
import type { FinanceData, NoteKind, NoteLinkType } from '../../types.ts'

/**
 * `data` is passed down from the parent page (Notes.tsx already holds it via
 * its own useFinanceData() call) rather than fetched here — no modal in this
 * app calls useFinanceData() itself; every existing one receives data as a
 * prop from the page that mounts it.
 */
export function AddNoteModal({
  open,
  data,
  onClose,
}: {
  open: boolean
  data: FinanceData
  onClose: () => void
}) {
  const { addNote } = useFinanceMutations()
  const [kind, setKind] = useState<NoteKind>('freeform')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [linkedType, setLinkedType] = useState<NoteLinkType | ''>('')
  const [linkedId, setLinkedId] = useState<number | ''>('')

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
    addNote.mutate({
      kind,
      title: trimmed,
      body: kind === 'freeform' ? body.trim() || undefined : undefined,
      linked_type: linkedType || undefined,
      linked_id: linkedType && linkedId !== '' ? linkedId : undefined,
    })
  }

  return (
    <Modal open={open} title="Add note" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <Field label="Kind">
          <SelectInput value={kind} onChange={(e) => setKind(e.target.value as NoteKind)}>
            <option value="freeform">Freeform</option>
            <option value="checklist">Checklist</option>
          </SelectInput>
        </Field>
        <Field label="Title">
          <TextInput required value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        {kind === 'freeform' && (
          <Field label="Notes">
            <TextInput value={body} onChange={(e) => setBody(e.target.value)} />
          </Field>
        )}
        <LinkPickerFields
          linkLabels={LINK_LABEL}
          linkedType={linkedType}
          onTypeChange={(t) => {
            setLinkedType(t)
            setLinkedId('')
          }}
          linkedId={linkedId}
          onIdChange={setLinkedId}
          linkOptions={linkOptions}
          needsTarget={linkedType !== ''}
        />

        <div className="mt-1 flex justify-end gap-2">
          <SecondaryButton type="button" onClick={onClose}>
            Cancel
          </SecondaryButton>
          <Button type="submit" disabled={!title.trim() || (linkedType !== '' && linkedId === '')}>
            Add note
          </Button>
        </div>
      </form>
    </Modal>
  )
}
