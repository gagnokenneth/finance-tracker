import { useEffect, useRef } from 'react'

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

/**
 * Every active caller, oldest first. One Escape closes only the newest — a
 * confirm dialog opened over a modal closes alone, not the modal under it.
 */
const stack: Array<{ current: () => void }> = []

function onKeyDown(e: KeyboardEvent) {
  if (e.key !== 'Escape' || e.defaultPrevented || dismissesOpenPicker(e.target)) return
  stack.at(-1)?.current()
}

/** Calls `onEscape` on an Escape keypress anywhere, but only while `active`
 *  and only if nothing activated after it is still listening. */
export function useEscape(active: boolean, onEscape: () => void): void {
  const handler = useRef(onEscape)
  useEffect(() => {
    handler.current = onEscape
  })

  useEffect(() => {
    if (!active) return
    stack.push(handler)
    if (stack.length === 1) document.addEventListener('keydown', onKeyDown)
    return () => {
      stack.splice(stack.indexOf(handler), 1)
      if (stack.length === 0) document.removeEventListener('keydown', onKeyDown)
    }
  }, [active])
}
