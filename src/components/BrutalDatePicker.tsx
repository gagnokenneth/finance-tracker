import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { useAnchoredOverlay } from '../hooks/useAnchoredOverlay.ts'
import { addMonths, dateOn, isoDate, monthGrid, monthLabel, shiftDays, WEEKDAY_SHORT } from '../lib/currentMonth.ts'
import { controlClass, useLook } from './brutalLook.tsx'
import { invertOnHover, panelClass, smallButtonBase } from './brutal.tsx'
import { CalendarIcon } from './icons.tsx'

const STEP_CLASS = `${smallButtonBase} flex size-8 items-center justify-center`
const DAY_STEP: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }

/**
 * A date field whose calendar is drawn by the app, not the browser: a native
 * <input type="date"> pops up the OS's own picker, which no CSS can reach.
 * Values are the app's yyyy-mm-dd strings; positioning and dismissal are
 * useAnchoredOverlay's. Escape closes only the calendar, leaving any modal
 * under it open (see useEscape's stack).
 */
export function BrutalDatePicker({
  id,
  value,
  onChange,
}: {
  id?: string
  value: string
  onChange: (value: string) => void
}) {
  const ui = useLook()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  // The month on screen, and its one tabbable day (roving tabindex). Both
  // are set fresh on every open, so their initial values are never shown.
  const [view, setView] = useState('')
  const [focused, setFocused] = useState('')
  // Bumped when keyboard focus should actually move to `focused` — on open
  // and on arrow keys, but not on paging, which keeps focus on its button.
  const [focusRequest, setFocusRequest] = useState(0)

  const close = (refocus: boolean) => {
    setOpen(false)
    if (refocus) triggerRef.current?.focus()
  }
  const { popoverRef, style, placed } = useAnchoredOverlay(open, triggerRef, close)

  const openPicker = () => {
    const start = value || isoDate()
    setView(start.slice(0, 7))
    setFocused(start)
    setFocusRequest((n) => n + 1)
    setOpen(true)
  }

  // Waits for `placed`: the popover is hidden for its first measuring pass,
  // and a hidden element can't take focus.
  useEffect(() => {
    if (placed) popoverRef.current?.querySelector<HTMLButtonElement>(`[data-date="${focused}"]`)?.focus()
    // Deliberately not on `focused` alone — see focusRequest.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placed, focusRequest, popoverRef])

  /** Pages a month, carrying the tabbable day to the same date there
   *  (clamped — Jan 31 → Feb 28) so Tab can still reach the grid. */
  const page = (months: number) => {
    const next = addMonths(view, months)
    const [year, month] = next.split('-').map(Number)
    setView(next)
    setFocused(dateOn(year, month, Number(focused.slice(8, 10))))
  }

  const onDayKey = (e: KeyboardEvent) => {
    const step = DAY_STEP[e.key]
    if (step === undefined) return
    e.preventDefault()
    const next = shiftDays(focused, step)
    setFocused(next)
    setView(next.slice(0, 7))
    setFocusRequest((n) => n + 1)
  }

  const today = isoDate()
  const dayClass = (date: string) =>
    date === value
      ? 'border-black bg-black font-bold text-white'
      : `${date === today ? 'border-black' : 'border-transparent'} ${
          date.startsWith(view) ? 'text-black' : 'text-neutral-400'
        } ${invertOnHover}`

  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => (open ? close(true) : openPicker())}
        className={`${controlClass} ${ui.input} flex cursor-pointer items-center justify-between gap-3 text-left`}
      >
        <span className="tnum">{value || '—'}</span>
        <CalendarIcon />
      </button>
      {open &&
        createPortal(
          <div
            ref={popoverRef}
            role="dialog"
            aria-label="Choose date"
            style={style}
            className={`${panelClass} z-[70] w-72 p-3`}
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <button type="button" aria-label="Previous month" className={STEP_CLASS} onClick={() => page(-1)}>
                ←
              </button>
              <span className="font-mono text-xs font-bold tracking-wider uppercase">{monthLabel(view)}</span>
              <button type="button" aria-label="Next month" className={STEP_CLASS} onClick={() => page(1)}>
                →
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {WEEKDAY_SHORT.map((d) => (
                <span key={d} className="py-1 text-center font-mono text-[10px] font-bold text-neutral-500">
                  {d[0]}
                </span>
              ))}
              {monthGrid(...(view.split('-').map(Number) as [number, number])).map((date) => (
                <button
                  key={date}
                  type="button"
                  data-date={date}
                  tabIndex={date === focused ? 0 : -1}
                  aria-label={date}
                  aria-pressed={date === value}
                  onClick={() => {
                    onChange(date)
                    close(true)
                  }}
                  onKeyDown={onDayKey}
                  className={`tnum flex h-8 items-center justify-center border font-mono text-xs focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-black ${dayClass(date)}`}
                >
                  {Number(date.slice(8, 10))}
                </button>
              ))}
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
