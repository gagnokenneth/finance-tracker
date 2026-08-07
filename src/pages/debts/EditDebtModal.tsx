import { useState } from 'react'
import type { FormEvent } from 'react'
import { Modal } from '../../components/Modal.tsx'
import { Field, TextInput, Button } from '../../components/ui.tsx'

/**
 * Renames a debt. Type is fixed at creation — changing it would invalidate
 * every existing row, and wrong amounts are corrected by editing rows.
 */
export function EditDebtModal({
  open,
  currentName,
  pending,
  error,
  onSubmit,
  onClose,
}: {
  open: boolean
  currentName: string
  pending?: boolean
  error?: boolean
  onSubmit: (name: string) => void
  onClose: () => void
}) {
  const [name, setName] = useState(currentName)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (name.trim()) onSubmit(name.trim())
  }

  return (
    <Modal open={open} title="Edit Debt" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <Field label="Name">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>
        {error && <p className="text-sm text-red-600">Could not save. Please try again.</p>}
        <div className="mt-1 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Cancel
          </button>
          <Button type="submit" disabled={pending}>
            Save
          </Button>
        </div>
      </form>
    </Modal>
  )
}
