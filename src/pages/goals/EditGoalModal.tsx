import { useState } from 'react'
import type { FormEvent } from 'react'
import { useFinanceMutations } from '../../hooks/useFinanceMutations.ts'
import { referenceable } from '../../lib/tempId.ts'
import { GOAL_LINK_LABEL } from '../../lib/goals.ts'
import { Modal } from '../../components/Modal.tsx'
import { Field, TextInput, SelectInput, Button, SecondaryButton } from '../../components/ui.tsx'
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
  const [title, setTitle] = useState(goal.title)
  const [targetDate, setTargetDate] = useState(goal.target_date ?? '')
  const [linkedType, setLinkedType] = useState<GoalLinkType | ''>(goal.linked_type ?? '')
  const [linkedId, setLinkedId] = useState<number | ''>(goal.linked_id ?? '')
  const [notes, setNotes] = useState(goal.notes ?? '')

  const bills = referenceable(data.bills)
  const debts = referenceable(data.debts)
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
        <Field label="Link to (optional)">
          <SelectInput
            value={linkedType}
            onChange={(e) => {
              setLinkedType(e.target.value as GoalLinkType | '')
              setLinkedId('')
            }}
          >
            <option value="">Nothing</option>
            {(Object.keys(GOAL_LINK_LABEL) as GoalLinkType[]).map((t) => (
              <option key={t} value={t}>
                {GOAL_LINK_LABEL[t]}
              </option>
            ))}
          </SelectInput>
        </Field>
        {needsTarget && (
          <Field label={GOAL_LINK_LABEL[linkedType as GoalLinkType]}>
            <SelectInput
              required
              value={linkedId}
              onChange={(e) => setLinkedId(e.target.value ? Number(e.target.value) : '')}
            >
              <option value="">Select…</option>
              {linkOptions.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </SelectInput>
          </Field>
        )}
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
