import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import {
  BrutalModal,
  BrutalModalBody,
  BrutalModalFooter,
  BrutalField,
  BrutalInput,
  BrutalMoneyInput,
  BrutalButton,
  BrutalSecondaryButton,
} from '../../components/brutal.tsx'
import type { LookName } from '../../components/brutalLook.tsx'
import { BrutalDatePicker } from '../../components/BrutalDatePicker.tsx'
import { isoDate } from '../../lib/currentMonth.ts'
import { activeSources } from '../../lib/income.ts'
import { SourcePicker } from './SourcePicker.tsx'
import type { IncomeEntry, IncomeSource } from '../../types.ts'

export interface IncomeFormValues {
  source_id: number
  amount: number
  date: string
  /** Trimmed; empty when there are no notes. */
  notes: string
}

/**
 * The income entry form, shared by Add and Edit — they differ only in their
 * starting values and what they do with the result. Mount it only while open;
 * the initial values are read once, on mount.
 */
export function IncomeFormModal({
  title,
  submitLabel,
  look,
  sources,
  initial,
  onSubmit,
  onClose,
}: {
  title: string
  submitLabel: string
  look?: LookName
  sources: IncomeSource[]
  /** The entry being edited. Its source stays offered and valid even once
   *  archived, so archiving a source never strands its history. */
  initial?: IncomeEntry
  onSubmit: (values: IncomeFormValues) => void
  onClose: () => void
}) {
  const idPrefix = useId()
  const [sourceId, setSourceId] = useState<number | null>(initial?.source_id ?? null)
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '')
  const [date, setDate] = useState(initial?.date ?? isoDate())
  const [notes, setNotes] = useState(initial?.notes ?? '')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    // Revalidated here, not just at selection: a refetch can archive or remove
    // the chosen source while this form is open.
    const valid =
      sourceId !== null &&
      (sourceId === initial?.source_id || activeSources(sources).some((s) => s.id === sourceId))
    if (!valid || !amount) return
    onSubmit({ source_id: sourceId, amount: Number(amount), date, notes: notes.trim() })
  }

  return (
    <BrutalModal open title={title} onClose={onClose} look={look}>
      <form onSubmit={submit}>
        <BrutalModalBody>
          <SourcePicker
            id={`${idPrefix}-source`}
            sources={sources}
            value={sourceId}
            onChange={setSourceId}
            includeId={initial?.source_id}
          />
          <BrutalField label="Amount" htmlFor={`${idPrefix}-amount`} required>
            <BrutalMoneyInput
              id={`${idPrefix}-amount`}
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </BrutalField>
          <BrutalField label="Date" htmlFor={`${idPrefix}-date`} required>
            <BrutalDatePicker id={`${idPrefix}-date`} value={date} onChange={setDate} />
          </BrutalField>
          <BrutalField label="Notes" htmlFor={`${idPrefix}-notes`}>
            <BrutalInput id={`${idPrefix}-notes`} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </BrutalField>
        </BrutalModalBody>
        <BrutalModalFooter>
          <BrutalSecondaryButton type="button" onClick={onClose}>
            Cancel
          </BrutalSecondaryButton>
          <BrutalButton type="submit">{submitLabel}</BrutalButton>
        </BrutalModalFooter>
      </form>
    </BrutalModal>
  )
}
