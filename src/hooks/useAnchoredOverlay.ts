import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, RefObject } from 'react'
import { useClickOutside } from './useClickOutside.ts'
import { useEscape } from './useEscape.ts'

const GAP = 4
const EDGE = 8

/**
 * Everything a popover anchored to a field needs besides its own content:
 * fixed coordinates under the trigger (above it when there is more room
 * there, and clamped inside the screen when neither side has enough),
 * measured from the rendered popover itself rather than a guessed size, and
 * dismissal by Escape, an outside click, or any scroll or resize that would
 * leave it floating detached.
 *
 * Render the popover through a portal with `ref={popoverRef}` and
 * `style={style}`: it is hidden until first measured, and `placed` turns true
 * once it is visible (focus can't land in it before then). It is re-measured
 * whenever its own size changes, so content that grows — a month with an
 * extra week — re-flips it rather than running off the screen.
 *
 * `onDismiss(refocus)` — true for Escape, which should hand focus back to the
 * trigger; false for a click or scroll that has already moved the user on.
 */
export function useAnchoredOverlay(
  open: boolean,
  triggerRef: RefObject<HTMLElement | null>,
  onDismiss: (refocus: boolean) => void,
): { popoverRef: RefObject<HTMLDivElement | null>; style: CSSProperties; placed: boolean } {
  const popoverRef = useRef<HTMLDivElement>(null)
  const [place, setPlace] = useState<CSSProperties | null>(null)

  useLayoutEffect(() => {
    const popoverEl = popoverRef.current
    if (!open || !popoverEl) return
    const measure = () => {
      const trigger = triggerRef.current?.getBoundingClientRect()
      if (!trigger) return
      const { height, width } = popoverEl.getBoundingClientRect()
      const vh = window.innerHeight
      const below = vh - trigger.bottom - GAP
      const above = trigger.top - GAP
      // Below when it fits; otherwise whichever side has more room. When
      // neither side has enough, it is clamped inside the viewport (covering
      // the field) rather than left hanging off an edge.
      const placeAbove = below < height && above > below
      const vertical = placeAbove
        ? height <= above - EDGE
          ? { bottom: vh - trigger.top + GAP }
          : { top: EDGE }
        : { top: Math.max(EDGE, Math.min(trigger.bottom + GAP, vh - height - EDGE)) }
      setPlace({ left: Math.max(EDGE, Math.min(trigger.left, window.innerWidth - width - EDGE)), ...vertical })
    }
    // Before paint on every open, so a previous open's coordinates are never
    // what the user sees; then again whenever the popover's own size changes.
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(popoverEl)
    return () => observer.disconnect()
  }, [open, triggerRef])

  useEscape(open, () => onDismiss(true))
  useClickOutside(open, [triggerRef, popoverRef], () => onDismiss(false), { consume: true })

  const dismiss = useRef(onDismiss)
  useEffect(() => {
    dismiss.current = onDismiss
  })
  useEffect(() => {
    if (!open) return
    const onShift = (e: Event) => {
      if (!popoverRef.current?.contains(e.target as Node)) dismiss.current(false)
    }
    window.addEventListener('scroll', onShift, true)
    window.addEventListener('resize', onShift)
    return () => {
      window.removeEventListener('scroll', onShift, true)
      window.removeEventListener('resize', onShift)
    }
  }, [open])

  const placed = open && place !== null
  return {
    popoverRef,
    style: { position: 'fixed', ...(place ?? { top: 0, left: 0, visibility: 'hidden' }) },
    placed,
  }
}
