import { useState } from 'react'
import { useFinanceData } from '../hooks/useFinanceData.ts'
import { useFinanceMutations } from '../hooks/useFinanceMutations.ts'
import { topLevelGoals, subgoalsOf, GOAL_LINK_LABEL, GOAL_STATUS_LABEL, GOAL_STATUSES } from '../lib/goals.ts'
import { isTemp } from '../lib/tempId.ts'
import { Card } from '../components/Card.tsx'
import { RowButton, SelectInput, Button } from '../components/ui.tsx'
import { PendingBadge } from '../components/PendingBadge.tsx'
import { ConfirmDialog } from '../components/ConfirmDialog.tsx'
import { EmptyState } from '../components/EmptyState.tsx'
import { LoadError } from '../components/LoadError.tsx'
import { LoadingScreen } from '../components/LoadingScreen.tsx'
import { AddGoalModal } from './goals/AddGoalModal.tsx'
import { EditGoalModal } from './goals/EditGoalModal.tsx'
import type { Goal } from '../types.ts'

function GoalRow({ goal, indented }: { goal: Goal; indented: boolean }) {
  const { updateGoal } = useFinanceMutations()
  const pending = isTemp(goal.id)
  return (
    <div className={`flex items-center justify-between gap-3 py-2 ${indented ? 'pl-6' : ''}`}>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium text-ink">{goal.title}</span>
          {pending && <PendingBadge />}
        </div>
        <p className="mt-0.5 text-xs text-ink-faint">
          {goal.target_date ?? 'Someday'}
          {goal.linked_type && ` · Linked to ${GOAL_LINK_LABEL[goal.linked_type]}`}
        </p>
      </div>
      <SelectInput
        value={goal.status}
        disabled={pending}
        onChange={(e) => updateGoal.mutate({ id: goal.id, patch: { status: e.target.value as Goal['status'] } })}
        className="w-36 shrink-0"
      >
        {GOAL_STATUSES.map((s) => (
          <option key={s} value={s}>
            {GOAL_STATUS_LABEL[s]}
          </option>
        ))}
      </SelectInput>
    </div>
  )
}

export function Goals() {
  const { data, isPending, isError, error } = useFinanceData()
  const { deleteGoal } = useFinanceMutations()
  const [adding, setAdding] = useState(false)
  const [addingSubgoalTo, setAddingSubgoalTo] = useState<number | null>(null)
  const [editing, setEditing] = useState<Goal | null>(null)
  const [deleting, setDeleting] = useState<Goal | null>(null)

  if (isPending) return <LoadingScreen />
  if (isError || !data) return <LoadError error={error} />

  const goals = topLevelGoals(data.goals)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Goals</h1>
        <Button type="button" onClick={() => setAdding(true)}>
          Add goal
        </Button>
      </div>

      {goals.length === 0 ? (
        <EmptyState title="Nothing tracked yet">
          Set an outcome to work toward, with milestones along the way.
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {goals.map((goal) => {
            const subgoals = subgoalsOf(data.goals, goal.id)
            const pending = isTemp(goal.id)
            return (
              <Card key={goal.id}>
                <div className="flex items-start justify-between gap-4">
                  <GoalRow goal={goal} indented={false} />
                </div>
                {subgoals.length > 0 && (
                  <div className="mt-1 divide-y divide-edge border-t border-edge">
                    {subgoals.map((sub) => (
                      <GoalRow key={sub.id} goal={sub} indented />
                    ))}
                  </div>
                )}
                <div className="mt-3 flex items-center gap-2">
                  {pending ? (
                    <PendingBadge />
                  ) : (
                    <>
                      <RowButton onClick={() => setAddingSubgoalTo(goal.id)}>Add subgoal</RowButton>
                      <RowButton onClick={() => setEditing(goal)}>Edit</RowButton>
                      <RowButton tone="danger" onClick={() => setDeleting(goal)}>
                        Delete
                      </RowButton>
                    </>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {adding && <AddGoalModal open data={data} onClose={() => setAdding(false)} />}
      {addingSubgoalTo !== null && (
        <AddGoalModal
          open
          data={data}
          parentGoalId={addingSubgoalTo}
          onClose={() => setAddingSubgoalTo(null)}
        />
      )}
      {editing && <EditGoalModal open goal={editing} data={data} onClose={() => setEditing(null)} />}

      <ConfirmDialog
        open={deleting !== null}
        title="Delete goal"
        message={
          deleting
            ? `Delete "${deleting.title}"? Its subgoals go with it, and any task attached to it is unlinked, not deleted. This cannot be undone.`
            : ''
        }
        confirmLabel="Delete goal"
        onConfirm={() => {
          if (deleting) deleteGoal.mutate(deleting.id)
          setDeleting(null)
        }}
        onClose={() => setDeleting(null)}
      />
    </div>
  )
}
