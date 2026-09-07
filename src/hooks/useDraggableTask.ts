import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import type { CSSProperties } from 'react'
import { isTemp } from '../lib/tempId.ts'
import type { Task } from '../types.ts'

/**
 * Shared drag-wiring for anything that represents one Task and can be
 * dragged onto a board column — TaskCard (on the board) and
 * BacklogTaskRow (in the Backlog list) both wrap their own content with
 * this, so the dnd-kit boilerplate exists in exactly one place.
 */
export function useDraggableTask(task: Task) {
  const pending = isTemp(task.id)
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    disabled: pending,
  })
  const style: CSSProperties = { transform: CSS.Translate.toString(transform) }
  return { pending, setNodeRef, dragAttributes: attributes, dragListeners: listeners, style, isDragging }
}
