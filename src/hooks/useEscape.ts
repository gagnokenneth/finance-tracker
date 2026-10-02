import { useEffect } from 'react'

/**
 * True when the Escape is the browser closing an open <select> list — its
 * target is then the focused <option> inside it, not the select. With
 * base-select (index.css) that list is part of the page, so its Escape
 * reaches document too; `:open` throws where unsupported, and there the list
 * is OS-drawn and never forwards the key anyway.
 */
function dismissesOpenPicker(target: EventTarget | null): boolean {
  try {
    return target instanceof Element && !!target.closest('select')?.matches(':open')
  } catch {
    return false
  }
}

/** Calls `onEscape` on an Escape keypress anywhere, but only while `active`. */
export function useEscape(active: boolean, onEscape: () => void): void {
  useEffect(() => {
    if (!active) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented || dismissesOpenPicker(e.target)) return
      onEscape()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [active, onEscape])
}
