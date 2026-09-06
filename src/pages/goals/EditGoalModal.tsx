import { useState } from 'react'
import type { FormEvent } from 'react'
import { useFinanceMutations } from '../../hooks/useFinanceMutations.ts'
import { referenceable, safeLinkedId } from '../../lib/tempId.ts'
import { GOAL_LINK_LABEL } from '../../lib/goals.ts'
import { Modal } from '../../components/Modal.tsx'
import { Field, TextInput, Button, SecondaryButton } from '../../components/ui.tsx'
import { LinkPickerFields } from '../../components/LinkPickerFields.tsx'
import type { FinanceData, Goal, GoalLinkType } from '../../types.ts'

export function EditGoalModal({
  open,
  goal,
  data,
  onClose,
}: {
  open: boolean
  goal: Goal
  data: FinanceData
  onClose: () => void
}) {
  const { updateGoal } = useFinanceMutations()
  const bills = referenceable(data.bills)
  const debts = referenceable(data.debts)

  const [title, setTitle] = useState(goal.title)
  const [targetDate, setTargetDate] = useState(goal.target_date ?? '')
  const [linkedType, setLinkedType] = useState<GoalLinkType | ''>(goal.linked_type ?? '')
  const [linkedId, setLinkedId] = useState<number | ''>(() =>
    safeLinkedId(goal.linked_id, goal.linked_type === 'bill' ? bills : goal.linked_type === 'debt' ? debts : []),
  )
  const [notes, setNotes] = useState(goal.notes ?? '')

  const linkOptions = linkedType === 'bill' ? bills : linkedType === 'debt' ? debts : []
  const needsTarget = linkedType !== '' && linkedType !== 'savings'

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
        linked_type: linkedType || null,
        linked_id: needsTarget && linkedId !== '' ? linkedId : null,
        notes: notes.trim() || null,
      },
    })
  }

  return (
    <Modal open={open} title="Edit goal" onClose={onClose}>
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
            Save
          </Button>
        </div>
      </form>
    </Modal>
  )
}
