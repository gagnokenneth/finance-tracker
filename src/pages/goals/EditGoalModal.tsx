import { useState } from 'react'
import type { FormEvent } from 'react'
import { useFinanceMutations } from '../../hooks/useFinanceMutations.ts'
import { Modal } from '../../components/Modal.tsx'
import { Field, TextInput, Button, SecondaryButton } from '../../components/ui.tsx'
import type { Goal } from '../../types.ts'

export function EditGoalModal({
  open,
  goal,
  onClose,
}: {
  open: boolean
  goal: Goal
  onClose: () => void
}) {
  const { updateGoal } = useFinanceMutations()
  const [title, setTitle] = useState(goal.title)
  const [targetDate, setTargetDate] = useState(goal.target_date ?? '')
  const [notes, setNotes] = useState(goal.notes ?? '')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return
    onClose()
    // null clears an optional field on the wire — undefined would be
    // dropped by JSON.stringify and the backend would keep the old value.
    // See GoalPatch in FinanceApi.ts.
    updateGoal.mutate({
      id: goal.id,
      patch: {
        title: trimmed,
        target_date: targetDate || null,
        notes: notes.trim() || null,
      },
    })
  }

  return (
    <Modal open={open} title="Edit goal" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <Field label="Title" required>
          <TextInput required value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="Target date">
          <TextInput type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
        </Field>
        <Field label="Notes">
          <TextInput value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>

        <div className="mt-1 flex justify-end gap-2">
          <SecondaryButton type="button" onClick={onClose}>
            Cancel
          </SecondaryButton>
          <Button type="submit" disabled={!title.trim()}>
            Save
          </Button>
        </div>
      </form>
    </Modal>
  )
}
