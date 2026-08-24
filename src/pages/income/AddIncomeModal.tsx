import { useState } from 'react'
import type { FormEvent } from 'react'
import { Modal } from '../../components/Modal.tsx'
import { Field, TextInput, Button, SecondaryButton } from '../../components/ui.tsx'
import { useFinanceMutations } from '../../hooks/useFinanceMutations.ts'
import { isoDate } from '../../lib/currentMonth.ts'
import { SourcePicker } from './SourcePicker.tsx'
import type { IncomeSource } from '../../types.ts'

export function AddIncomeModal({
  open,
  sources,
  onClose,
}: {
  open: boolean
  sources: IncomeSource[]
  onClose: () => void
}) {
  const { addIncome } = useFinanceMutations()
  const [sourceId, setSourceId] = useState<number | null>(null)
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(isoDate())
  const [notes, setNotes] = useState('')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    // Revalidated here, not just at selection: a refetch can archive or remove
    // the chosen source while this form is open.
    const valid = sources.some((s) => s.id === sourceId && !s.archived && s.id > 0)
    if (!valid || !amount) return
    addIncome.mutate({
      source_id: sourceId as number,
      amount: Number(amount),
      date,
      notes: notes.trim() || undefined,
    })
    onClose()
  }

  return (
    <Modal open={open} title="Add income" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <SourcePicker sources={sources} value={sourceId} onChange={setSourceId} />
        <Field label="Amount">
          <TextInput
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </Field>
        <Field label="Date">
          <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Notes">
          <TextInput value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2">
          <SecondaryButton type="button" onClick={onClose}>
            Cancel
          </SecondaryButton>
          <Button type="submit">Add income</Button>
        </div>
      </form>
    </Modal>
  )
}
