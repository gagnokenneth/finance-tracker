import { useState } from 'react'
import type { FormEvent } from 'react'
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
    <BrutalModal open={open} title="Rename debt" onClose={onClose} look="plain">
      <form onSubmit={submit}>
        <BrutalModalBody>
          <BrutalField label="Name" htmlFor="rename-debt" required>
            <BrutalInput id="rename-debt" autoFocus value={name} onChange={(e) => setName(e.target.value)} required />
          </BrutalField>
        </BrutalModalBody>
        <BrutalModalFooter>
          <BrutalSecondaryButton type="button" onClick={onClose}>
            Cancel
          </BrutalSecondaryButton>
          <BrutalButton type="submit">Rename</BrutalButton>
        </BrutalModalFooter>
      </form>
    </BrutalModal>
  )
}
