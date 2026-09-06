import { useState } from 'react'
import type { FormEvent } from 'react'
import { useFinanceMutations } from '../../hooks/useFinanceMutations.ts'
import { referenceable } from '../../lib/tempId.ts'
import { GOAL_LINK_LABEL } from '../../lib/goals.ts'
import { Modal } from '../../components/Modal.tsx'
import { Field, TextInput, Button, SecondaryButton } from '../../components/ui.tsx'
import { LinkPickerFields } from '../../components/LinkPickerFields.tsx'
import type { FinanceData, GoalLinkType } from '../../types.ts'

/** `parentGoalId` set means this creates a subgoal under that goal. */
export function AddGoalModal({
  open,
  data,
  parentGoalId,
  onClose,
}: {
  open: boolean
  data: FinanceData
  parentGoalId?: number
  onClose: () => void
}) {
  const { addGoal } = useFinanceMutations()
  const [title, setTitle] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [linkedType, setLinkedType] = useState<GoalLinkType | ''>('')
  const [linkedId, setLinkedId] = useState<number | ''>('')
  const [notes, setNotes] = useState('')

  const bills = referenceable(data.bills)
  const debts = referenceable(data.debts)
  const linkOptions = linkedType === 'bill' ? bills : linkedType === 'debt' ? debts : []

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return
    onClose()
    addGoal.mutate({
      title: trimmed,
      target_date: targetDate || undefined,
      parent_goal_id: parentGoalId,
      linked_type: linkedType || undefined,
      linked_id: linkedType && linkedType !== 'savings' && linkedId !== '' ? linkedId : undefined,
      notes: notes.trim() || undefined,
    })
  }

  const needsTarget = linkedType !== '' && linkedType !== 'savings'

  return (
    <Modal open={open} title={parentGoalId ? 'Add subgoal' : 'Add goal'} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <Field label="Title">
          <TextInput required value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="Target date (optional)">
          <TextInput type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
        </Field>
        <LinkPickerFields
          linkLabels={GOAL_LINK_LABEL}
          linkedType={linkedType}
          onTypeChange={(t) => {
            setLinkedType(t)
            setLinkedId('')
          }}
          linkedId={linkedId}
          onIdChange={setLinkedId}
          linkOptions={linkOptions}
          needsTarget={needsTarget}
        />
        <Field label="Notes">
          <TextInput value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>

        <div className="mt-1 flex justify-end gap-2">
          <SecondaryButton type="button" onClick={onClose}>
            Cancel
          </SecondaryButton>
          <Button type="submit" disabled={!title.trim() || (needsTarget && linkedId === '')}>
            {parentGoalId ? 'Add subgoal' : 'Add goal'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
