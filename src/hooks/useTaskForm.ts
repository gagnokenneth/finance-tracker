import { useState } from 'react'
import type { Task, TaskRecurrence } from '../types.ts'
import type { NewTask } from '../api/FinanceApi.ts'

export interface TaskForm {
  title: string
  setTitle: (v: string) => void
  notes: string
  setNotes: (v: string) => void
  recurrence: TaskRecurrence | ''
  setRecurrence: (v: TaskRecurrence | '') => void
  goalId: number | ''
  setGoalId: (v: number | '') => void
  /** The write payload, or null while the form is incomplete. column_id and
   *  date are not this hook's to know — column_id is supplied by the
   *  caller (AddTaskModal), and date is never form-editable at all — a
   *  task only gets one by being dragged onto the board. */
  values: Omit<NewTask, 'column_id' | 'date'> | null
}

/**
 * Shared state for the add and edit task forms — collects the same fields
 * either way and differs only in what happens on submit, matching
 * useBillForm's own division of responsibility.
 */
export function useTaskForm(task?: Task): TaskForm {
  const [title, setTitle] = useState(task?.title ?? '')
  const [notes, setNotes] = useState(task?.notes ?? '')
  const [recurrence, setRecurrence] = useState<TaskRecurrence | ''>(task?.recurrence ?? '')
  const [goalId, setGoalId] = useState<number | ''>(task?.goal_id ?? '')

  const complete = title.trim() !== ''
  const values: Omit<NewTask, 'column_id' | 'date'> | null = !complete
    ? null
    : {
        title: title.trim(),
        notes: notes.trim() || undefined,
        recurrence: recurrence || undefined,
        goal_id: goalId === '' ? undefined : goalId,
      }

  return {
    title,
    setTitle,
    notes,
    setNotes,
    recurrence,
    setRecurrence,
    goalId,
    setGoalId,
    values,
  }
}
