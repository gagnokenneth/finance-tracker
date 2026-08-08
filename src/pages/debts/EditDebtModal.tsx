import { useState } from 'react'
import type { FormEvent } from 'react'
import { Modal } from '../../components/Modal.tsx'
import { Field, TextInput, Button, SecondaryButton } from '../../components/ui.tsx'

/**
 * Renames a debt. Type is fixed at creation — changing it would invalidate
 * every existing row, and wrong amounts are corrected by editing rows.
 */
export function EditDebtModal({
  open,
  currentName,
  onSubmit,
  onClose,
}: {
  open: boolean
  currentName: string
  onSubmit: (name: string) => void
  onClose: () => void
}) {
  const [name, setName] = useState(currentName)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (name.trim()) onSubmit(name.trim())
  }

  return (
    <Modal open={open} title="Rename debt" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <Field label="Name">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>
        <div className="mt-1 flex justify-end gap-2">
          <SecondaryButton type="button" onClick={onClose}>
            Cancel
          </SecondaryButton>
          <Button type="submit">
            Rename
          </Button>
        </div>
      </form>
    </Modal>
  )
}
