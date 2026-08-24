import { useState } from 'react'
import type { FormEvent } from 'react'
import { Modal } from '../../components/Modal.tsx'
import { Field, TextInput, Button, RowButton } from '../../components/ui.tsx'
import { PendingBadge } from '../../components/PendingBadge.tsx'
import { useFinanceMutations } from '../../hooks/useFinanceMutations.ts'
import { sourceUsage } from '../../lib/income.ts'
import { isTemp } from '../../lib/tempId.ts'
import type { IncomeEntry, IncomeSource } from '../../types.ts'

export function ManageSourcesModal({
  open,
  sources,
  entries,
  onClose,
}: {
  open: boolean
  sources: IncomeSource[]
  entries: IncomeEntry[]
  onClose: () => void
}) {
  const { addIncomeSource, updateIncomeSource, deleteIncomeSource } = useFinanceMutations()
  const [name, setName] = useState('')
  const [renamingId, setRenamingId] = useState<number | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const usage = sourceUsage(entries)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    addIncomeSource.mutate({ name: trimmed })
    setName('')
  }

  const startRename = (source: IncomeSource) => {
    setRenamingId(source.id)
    setRenameValue(source.name)
  }

  const submitRename = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = renameValue.trim()
    if (!trimmed || renamingId === null) return
    updateIncomeSource.mutate({ id: renamingId, patch: { name: trimmed } })
    setRenamingId(null)
  }

  return (
    <Modal open={open} title="Manage sources" onClose={onClose}>
      <form onSubmit={submit} className="flex items-end gap-2">
        <div className="flex-1">
          <Field label="New source">
            <TextInput value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
        </div>
        <Button type="submit">Add</Button>
      </form>

      <ul className="mt-4 divide-y divide-edge">
        {sources.map((s) => {
          const used = usage.get(s.id) ?? 0
          const pending = isTemp(s.id)
          return (
            <li key={s.id} className="flex items-center justify-between gap-3 py-2">
              {renamingId === s.id ? (
                <form onSubmit={submitRename} className="flex flex-1 items-center gap-2">
                  <TextInput
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                  />
                  <RowButton type="submit" tone="primary">
                    Save
                  </RowButton>
                  <RowButton type="button" onClick={() => setRenamingId(null)}>
                    Cancel
                  </RowButton>
                </form>
              ) : (
                <>
                  <span className="text-sm text-ink">
                    {s.name}
                    {s.archived && <span className="ml-2 text-xs text-ink-faint">Archived</span>}
                    {pending && <PendingBadge />}
                  </span>
                  <span className="flex items-center gap-2">
                    <RowButton onClick={() => startRename(s)} disabled={pending}>
                      Rename
                    </RowButton>
                    <RowButton
                      onClick={() =>
                        updateIncomeSource.mutate({ id: s.id, patch: { archived: !s.archived } })
                      }
                      disabled={pending}
                    >
                      {s.archived ? 'Restore' : 'Archive'}
                    </RowButton>
                    {/* Offered only when unused. Both backends refuse otherwise, so
                        this hides an action that would only ever fail. */}
                    {used === 0 && (
                      <RowButton
                        tone="danger"
                        onClick={() => deleteIncomeSource.mutate(s.id)}
                        disabled={pending}
                      >
                        Delete
                      </RowButton>
                    )}
                  </span>
                </>
              )}
            </li>
          )
        })}
      </ul>
    </Modal>
  )
}
