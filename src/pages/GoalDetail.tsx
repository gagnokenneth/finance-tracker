import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useFinanceData } from '../hooks/useFinanceData.ts'
import { useFinanceMutations } from '../hooks/useFinanceMutations.ts'
import { subgoalsOf, GOAL_STATUS_LABEL, GOAL_STATUS_CLASS } from '../lib/goals.ts'
import { isTemp } from '../lib/tempId.ts'
import { Card } from '../components/Card.tsx'
import { CardRow } from '../components/CardRow.tsx'
import { Pill } from '../components/StatusBadge.tsx'
import { RowButton, EditButton, DeleteButton } from '../components/ui.tsx'
import { PendingBadge } from '../components/PendingBadge.tsx'
import { ConfirmDialog } from '../components/ConfirmDialog.tsx'
import { LoadError } from '../components/LoadError.tsx'
import { LoadingScreen } from '../components/LoadingScreen.tsx'
import { AddGoalModal } from './goals/AddGoalModal.tsx'
import { EditGoalModal } from './goals/EditGoalModal.tsx'
import type { Goal, GoalStatus } from '../types.ts'

const STATUS_GLYPH: Record<GoalStatus, string> = {
  planned: '○',
  active: '◐',
  achieved: '✓',
  not_achieved: '✕',
  abandoned: '✕',
}

export function GoalDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data, isPending, isError, error } = useFinanceData()
  const { updateGoal, deleteGoal } = useFinanceMutations()
  const [editing, setEditing] = useState(false)
  const [addingSubgoal, setAddingSubgoal] = useState(false)
  const [deleting, setDeleting] = useState(false)

  if (isPending) return <LoadingScreen />
  if (isError || !data) return <LoadError error={error} />

  const goal = data.goals.find((g) => g.id === Number(id))
  if (!goal) return <LoadError error={new Error('Goal not found')} />

  const pending = isTemp(goal.id)
  const isTopLevel = goal.parent_goal_id === undefined
  const subgoals = isTopLevel ? subgoalsOf(data.goals, goal.id) : []
  const setStatus = (status: GoalStatus) => updateGoal.mutate({ id: goal.id, patch: { status } })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm ring-1 ring-inset ${GOAL_STATUS_CLASS[goal.status]}`}
              aria-hidden
            >
              {STATUS_GLYPH[goal.status]}
            </span>
            <h1 className="text-2xl font-semibold tracking-tight text-ink">{goal.title}</h1>
            {pending && <PendingBadge />}
          </div>
          <p className="mt-1 text-sm text-ink-soft">{goal.target_date || ' '}</p>
        </div>
        <div className="flex items-center gap-2">
          <EditButton type="button" onClick={() => setEditing(true)} />
          <DeleteButton type="button" onClick={() => setDeleting(true)} />
        </div>
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Pill label={GOAL_STATUS_LABEL[goal.status]} className={GOAL_STATUS_CLASS[goal.status]} />
          {!pending && (
            <div className="flex flex-wrap items-center gap-2">
              {goal.status === 'planned' && (
                <RowButton tone="primary" onClick={() => setStatus('active')}>
                  Start
                </RowButton>
              )}
              {goal.status === 'active' && (
                <>
                  <RowButton tone="primary" onClick={() => setStatus('achieved')}>
                    Mark achieved
                  </RowButton>
                  <RowButton onClick={() => setStatus('not_achieved')}>Mark not achieved</RowButton>
                </>
              )}
              {goal.status !== 'abandoned' && (
                <RowButton tone="danger" onClick={() => setStatus('abandoned')}>
                  Abandon
                </RowButton>
              )}
            </div>
          )}
        </div>
        {goal.notes && <p className="mt-4 text-sm whitespace-pre-wrap text-ink">{goal.notes}</p>}
      </Card>

      {isTopLevel && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-wide text-ink-faint uppercase">Subgoals</h2>
            {!pending && <RowButton onClick={() => setAddingSubgoal(true)}>Add subgoal</RowButton>}
          </div>
          {subgoals.length === 0 ? (
            <p className="text-sm text-ink-faint">No subgoals yet.</p>
          ) : (
            <div className="space-y-2">
              {subgoals.map((sub: Goal) => (
                <CardRow key={sub.id} to={`/goals/${sub.id}`} pending={isTemp(sub.id)}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-ink">{sub.title}</span>
                      {isTemp(sub.id) && <PendingBadge />}
                    </div>
                    <Pill label={GOAL_STATUS_LABEL[sub.status]} className={GOAL_STATUS_CLASS[sub.status]} />
                  </div>
                  <p className="mt-0.5 text-xs text-ink-faint">{sub.target_date || ' '}</p>
                </CardRow>
              ))}
            </div>
          )}
        </div>
      )}

      {editing && <EditGoalModal open goal={goal} onClose={() => setEditing(false)} />}
      {addingSubgoal && (
        <AddGoalModal open parentGoalId={goal.id} onClose={() => setAddingSubgoal(false)} />
      )}

      <ConfirmDialog
        open={deleting}
        title="Delete goal"
        message={
          isTopLevel
            ? `Delete "${goal.title}"? Its subgoals go with it, and any task attached to it or them is unlinked, not deleted. This cannot be undone.`
            : `Delete "${goal.title}"? Any task attached to it is unlinked, not deleted. This cannot be undone.`
        }
        confirmLabel="Delete goal"
        onConfirm={() => {
          setDeleting(false)
          void navigate(isTopLevel ? '/goals' : `/goals/${goal.parent_goal_id}`)
          deleteGoal.mutate(goal.id)
        }}
        onClose={() => setDeleting(false)}
      />
    </div>
  )
}
