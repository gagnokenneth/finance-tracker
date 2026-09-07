import { useState } from 'react'
import { useFinanceData } from '../hooks/useFinanceData.ts'
import { topLevelGoals, GOAL_STATUS_LABEL, GOAL_STATUS_CLASS } from '../lib/goals.ts'
import { isTemp } from '../lib/tempId.ts'
import { CardRow } from '../components/CardRow.tsx'
import { Pill } from '../components/StatusBadge.tsx'
import { PendingBadge } from '../components/PendingBadge.tsx'
import { EmptyState } from '../components/EmptyState.tsx'
import { Button } from '../components/ui.tsx'
import { LoadError } from '../components/LoadError.tsx'
import { LoadingScreen } from '../components/LoadingScreen.tsx'
import { AddGoalModal } from './goals/AddGoalModal.tsx'

export function Goals() {
  const { data, isPending, isError, error } = useFinanceData()
  const [adding, setAdding] = useState(false)

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
            const pending = isTemp(goal.id)
            return (
              <CardRow key={goal.id} to={`/goals/${goal.id}`} pending={pending}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold tracking-tight text-ink">{goal.title}</span>
                    {pending && <PendingBadge />}
                  </div>
                  <Pill label={GOAL_STATUS_LABEL[goal.status]} className={GOAL_STATUS_CLASS[goal.status]} />
                </div>
                <p className="mt-1 text-sm text-ink-soft">{goal.target_date || ' '}</p>
              </CardRow>
            )
          })}
        </div>
      )}

      {adding && <AddGoalModal open onClose={() => setAdding(false)} />}
    </div>
  )
}
