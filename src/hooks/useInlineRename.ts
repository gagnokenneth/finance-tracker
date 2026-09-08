import { useState } from 'react'
import type { KeyboardEvent } from 'react'

/**
 * Shared click-to-rename state machine: click the label to start editing,
 * blur or Enter saves (skipped if the draft is empty or unchanged), Escape
 * cancels without saving. Used by NoteDetail (note title) and
 * TaskColumnLane (column name) — both render their own input/label markup,
 * this hook only owns the state and the save/cancel rules.
 */
export function useInlineRename(currentValue: string, onSave: (trimmed: string) => void) {
  const [renaming, setRenaming] = useState(false)
  const [draft, setDraft] = useState('')

  const start = () => {
    setDraft(currentValue)
    setRenaming(true)
  }

  const save = () => {
    setRenaming(false)
    const trimmed = draft.trim()
    if (trimmed && trimmed !== currentValue) onSave(trimmed)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    // Blur (not a direct save() call) so onBlur remains the single place a
    // save happens — calling both would unmount the input mid-render and
    // let the resulting native blur fire a second, stale save with the same
    // value.
    if (e.key === 'Enter') e.currentTarget.blur()
    if (e.key === 'Escape') setRenaming(false)
  }

  return { renaming, draft, setDraft, start, save, onKeyDown }
}
