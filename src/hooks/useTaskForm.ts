import { useState } from 'react'
import type { Task, TaskRecurrence } from '../types.ts'
import type { NewTask } from '../api/FinanceApi.ts'

export interface TaskForm {
  title: string
  setTitle: (v: string) => void
  notes: string
  setNotes: (v: string) => void
  date: string
  setDate: (v: string) => void
  startTime: string
  setStartTime: (v: string) => void
  endTime: string
  setEndTime: (v: string) => void
  recurrence: TaskRecurrence | ''
  setRecurrence: (v: TaskRecurrence | '') => void
  goalId: number | ''
  setGoalId: (v: number | '') => void
  /** The write payload, or null while the form is incomplete. column_id is
   *  not this hook's to know — the caller (AddTaskModal / Task 2's board)
   *  supplies it. */
  values: Omit<NewTask, 'column_id'> | null
}

/**
 * Shared state for the add and edit task forms — collects the same fields
 * either way and differs only in what happens on submit, matching
 * useBillForm's own division of responsibility.
 */
export function useTaskForm(task?: Task, initialDate?: string): TaskForm {
  const [title, setTitle] = useState(task?.title ?? '')
  const [notes, setNotes] = useState(task?.notes ?? '')
  const [date, setDate] = useState(task?.date ?? initialDate ?? '')
  const [startTime, setStartTime] = useState(task?.start_time ?? '')
  const [endTime, setEndTime] = useState(task?.end_time ?? '')
  const [recurrence, setRecurrence] = useState<TaskRecurrence | ''>(task?.recurrence ?? '')
  const [goalId, setGoalId] = useState<number | ''>(task?.goal_id ?? '')

  const complete = title.trim() !== ''
  const values: Omit<NewTask, 'column_id'> | null = !complete
    ? null
    : {
        title: title.trim(),
        notes: notes.trim() || undefined,
        date: date || undefined,
        start_time: startTime || undefined,
        end_time: endTime || undefined,
        recurrence: recurrence || undefined,
        goal_id: goalId === '' ? undefined : goalId,
      }

  return {
    title,
    setTitle,
    notes,
    setNotes,
    date,
    setDate,
    startTime,
    setStartTime,
    endTime,
    setEndTime,
    recurrence,
    setRecurrence,
    goalId,
    setGoalId,
    values,
  }
}
