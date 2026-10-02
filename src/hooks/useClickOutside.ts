import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'

/** Stops the click that completes a press, so it acts on nothing. */
function swallowNextClick() {
  const swallow = (e: MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
  }
  document.addEventListener('click', swallow, true)
  // The click (if the press completes as one) fires right after mouseup in
  // the same task, so removing on the next tick catches it and nothing else.
  document.addEventListener('mouseup', () => setTimeout(() => document.removeEventListener('click', swallow, true)), {
    capture: true,
    once: true,
  })
}

/**
 * Calls `onOutside` on a mousedown outside every one of `refs`, but only while
 * `active` — a menu and its toggle, or a popover and the field that opened it.
 *
 * `consume` makes that press only dismiss: the click it completes is
 * swallowed, the way an OS popup's outside click is — so dismissing a
 * modal's date picker by clicking its backdrop doesn't close the modal too.
 */
export function useClickOutside(
  active: boolean,
  refs: Array<RefObject<HTMLElement | null>>,
  onOutside: () => void,
  { consume = false }: { consume?: boolean } = {},
): void {
  const handler = useRef(onOutside)
  useEffect(() => {
    handler.current = onOutside
  })
  const refsRef = useRef(refs)
  useEffect(() => {
    refsRef.current = refs
  })

  useEffect(() => {
    if (!active) return
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (refsRef.current.some((r) => r.current?.contains(target))) return
      if (consume) swallowNextClick()
      handler.current()
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [active, consume])
}
