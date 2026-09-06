import type { Goal, GoalLinkType, GoalStatus } from '../types.ts'

export const GOAL_LINK_LABEL: Record<GoalLinkType, string> = {
  bill: 'Bill',
  debt: 'Debt',
  savings: 'Savings',
}

export const GOAL_STATUS_LABEL: Record<GoalStatus, string> = {
  active: 'Active',
  achieved: 'Achieved',
  not_achieved: 'Not achieved',
  abandoned: 'Abandoned',
}

export const GOAL_STATUSES: GoalStatus[] = ['active', 'achieved', 'not_achieved', 'abandoned']

export function topLevelGoals(goals: Goal[]): Goal[] {
  return goals.filter((g) => g.parent_goal_id === undefined)
}

export function subgoalsOf(goals: Goal[], parentId: number): Goal[] {
  return goals.filter((g) => g.parent_goal_id === parentId)
}
