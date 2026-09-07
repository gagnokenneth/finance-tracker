import type { Goal, GoalStatus } from '../types.ts'

export const GOAL_STATUS_LABEL: Record<GoalStatus, string> = {
  planned: 'Planned',
  active: 'Active',
  achieved: 'Achieved',
  not_achieved: 'Not achieved',
  abandoned: 'Abandoned',
}

/** Graded the same way ROW_STATUS_CLASS is: colour never carries meaning alone. */
export const GOAL_STATUS_CLASS: Record<GoalStatus, string> = {
  planned: 'bg-paper text-ink-soft ring-ink-faint/30',
  active: 'bg-soon-wash text-soon ring-soon/20',
  achieved: 'bg-settled-wash text-settled ring-settled/20',
  not_achieved: 'bg-overdue-wash text-overdue ring-overdue/20',
  abandoned: 'bg-paper text-ink-faint ring-ink-faint/30',
}

/**
 * Mirrors the action set GoalDetail's own JSX renders (Start, Mark
 * achieved/not achieved, Abandon) — enforced in both backends too (see
 * isValidGoalTransition in Code.gs) so a raw API call can't set an illegal
 * transition the UI never offers.
 */
export function isValidGoalTransition(from: GoalStatus, to: GoalStatus): boolean {
  if (from === to) return true
  if (to === 'abandoned') return from !== 'abandoned'
  if (from === 'planned' && to === 'active') return true
  if (from === 'active' && (to === 'achieved' || to === 'not_achieved')) return true
  return false
}

export function topLevelGoals(goals: Goal[]): Goal[] {
  return goals.filter((g) => g.parent_goal_id === undefined)
}

export function subgoalsOf(goals: Goal[], parentId: number): Goal[] {
  return goals.filter((g) => g.parent_goal_id === parentId)
}
