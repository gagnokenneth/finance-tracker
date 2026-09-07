import { useState } from 'react'
import type { FormEvent } from 'react'
import { useFinanceMutations } from '../../hooks/useFinanceMutations.ts'
import { Modal } from '../../components/Modal.tsx'
import { Field, TextInput, Button, SecondaryButton } from '../../components/ui.tsx'

/** `parentGoalId` set means this creates a subgoal under that goal. */
export function AddGoalModal({
  open,
  parentGoalId,
  onClose,
}: {
  open: boolean
  parentGoalId?: number
  onClose: () => void
}) {
  const { addGoal } = useFinanceMutations()
  const [title, setTitle] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [notes, setNotes] = useState('')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return
    onClose()
    addGoal.mutate({
      title: trimmed,
      target_date: targetDate || undefined,
      parent_goal_id: parentGoalId,
      notes: notes.trim() || undefined,
    })
  }

  return (
    <Modal open={open} title={parentGoalId ? 'Add subgoal' : 'Add goal'} onClose={onClose}>
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
            {parentGoalId ? 'Add subgoal' : 'Add goal'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
