import { useRef, useState } from 'react'
import type { FormEvent, MouseEvent } from 'react'
import {
  BrutalModal,
  BrutalModalBody,
  BrutalField,
  BrutalInput,
  BrutalButton,
  BrutalIconButton,
  inlineEditClass,
  smallButtonClass,
  smallPrimaryButtonClass,
} from '../../components/brutal.tsx'
import { BrutalTag } from '../../components/brutalData.tsx'
import { DeleteIcon } from '../../components/icons.tsx'
import { PendingBadge } from '../../components/PendingBadge.tsx'
import { useFinanceMutations } from '../../hooks/useFinanceMutations.ts'
import { useInlineRename } from '../../hooks/useInlineRename.ts'
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
  const { addIncomeSource } = useFinanceMutations()
  const [name, setName] = useState('')
  const usage = sourceUsage(entries)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    addIncomeSource.mutate({ name: trimmed })
    setName('')
  }

  return (
    <BrutalModal open={open} title="Manage sources" onClose={onClose} look="plain">
      <BrutalModalBody>
        <form onSubmit={submit}>
          <BrutalField label="New source" htmlFor="new-source" required>
            {/* One row, stretched, so the button takes the field's own height. */}
            <div className="flex items-stretch gap-3">
              <BrutalInput
                id="new-source"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="min-w-0 flex-1"
              />
              <BrutalButton type="submit">Add</BrutalButton>
            </div>
          </BrutalField>
        </form>

        {sources.length > 0 && (
          <ul className="divide-y divide-neutral-200 border-y border-black">
            {sources.map((s) => (
              <SourceRow key={s.id} source={s} used={usage.get(s.id) ?? 0} />
            ))}
          </ul>
        )}
      </BrutalModalBody>
    </BrutalModal>
  )
}

/** One source: its name (or the rename box), and Rename / Archive / Delete. */
function SourceRow({ source, used }: { source: IncomeSource; used: number }) {
  const { updateIncomeSource, deleteIncomeSource } = useFinanceMutations()
  const rename = useInlineRename(source.name, (name) => updateIncomeSource.mutate({ id: source.id, patch: { name } }))
  const inputRef = useRef<HTMLInputElement>(null)
  const pending = isTemp(source.id)

  // The buttons keep focus in the input (onMouseDown), so Save can save the
  // hook's one way — by blurring it — and Cancel can cancel without a blur
  // saving first.
  const keepFocus = (e: MouseEvent) => e.preventDefault()

  return (
    <li className="flex items-center justify-between gap-3 py-3">
      {rename.renaming ? (
        <div className="flex flex-1 items-center gap-2">
          <input
            ref={inputRef}
            autoFocus
            aria-label={`Rename ${source.name}`}
            value={rename.draft}
            onChange={(e) => rename.setDraft(e.target.value)}
            onBlur={rename.save}
            onKeyDown={rename.onKeyDown}
            className={`${inlineEditClass} h-7 min-w-0 flex-1 px-2 font-mono text-sm`}
          />
          <button
            type="button"
            className={smallPrimaryButtonClass}
            onMouseDown={keepFocus}
            onClick={() => inputRef.current?.blur()}
          >
            Save
          </button>
          <button type="button" className={smallButtonClass} onMouseDown={keepFocus} onClick={rename.cancel}>
            Cancel
          </button>
        </div>
      ) : (
        <>
          <span className="flex min-w-0 items-center gap-2 font-mono text-sm text-black">
            <span className="truncate">{source.name}</span>
            {source.archived && <BrutalTag muted>Archived</BrutalTag>}
            {pending && <PendingBadge />}
          </span>
          <span className="flex shrink-0 items-center gap-2">
            <button type="button" className={smallButtonClass} onClick={rename.start} disabled={pending}>
              Rename
            </button>
            <button
              type="button"
              className={smallButtonClass}
              onClick={() => updateIncomeSource.mutate({ id: source.id, patch: { archived: !source.archived } })}
              disabled={pending}
            >
              {source.archived ? 'Restore' : 'Archive'}
            </button>
            {/* Offered only when unused. Both backends refuse otherwise, so
                this hides an action that would only ever fail. */}
            {used === 0 && (
              <BrutalIconButton size="sm" label="Delete" onClick={() => deleteIncomeSource.mutate(source.id)} disabled={pending}>
                <DeleteIcon />
              </BrutalIconButton>
            )}
          </span>
        </>
      )}
    </li>
  )
}
