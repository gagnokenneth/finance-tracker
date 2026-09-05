import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useFinanceData } from '../hooks/useFinanceData.ts'
import { eventsInRange, STATUS_DOT } from '../lib/calendar.ts'
import type { CalendarEvent } from '../lib/calendar.ts'
import { monthKey, addMonths, monthWindow, dateOn, daysInMonth, isoDate, shiftDays } from '../lib/currentMonth.ts'
import { SecondaryButton } from '../components/ui.tsx'
import { LoadError } from '../components/LoadError.tsx'
import { LoadingScreen } from '../components/LoadingScreen.tsx'
import { AddTaskModal } from './tasks/AddTaskModal.tsx'

const WEEKDAY_LABEL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/**
 * Every ISO date the grid needs to render, in order — the visible month
 * plus enough of the neighboring months to fill whole weeks. Uses shiftDays,
 * not dateOn's own arithmetic directly: dateOn clamps a day number above the
 * month's length (by design, for bill-recurrence callers), which silently
 * produced duplicate trailing dates here instead of rolling into next month.
 */
function monthGrid(year: number, monthNum: number): string[] {
  const firstWeekday = new Date(year, monthNum - 1, 1).getDay()
  const total = daysInMonth(year, monthNum)
  const cellCount = Math.ceil((firstWeekday + total) / 7) * 7
  const firstOfMonth = dateOn(year, monthNum, 1)
  return Array.from({ length: cellCount }, (_, i) => shiftDays(firstOfMonth, i - firstWeekday))
}

function CalendarDay({
  date,
  inMonth,
  isToday,
  events,
  onAddTask,
}: {
  date: string
  inMonth: boolean
  isToday: boolean
  events: CalendarEvent[]
  onAddTask: (date: string) => void
}) {
  const day = Number(date.slice(8, 10))
  return (
    <div
      className={`group min-h-24 rounded-lg border p-1.5 ${
        isToday ? 'border-brand bg-brand/5' : 'border-edge'
      } ${inMonth ? 'bg-white' : 'bg-paper/60'}`}
    >
      <div className="flex items-center justify-between">
        <span className={`tnum font-mono text-xs ${inMonth ? 'text-ink-soft' : 'text-ink-faint'}`}>
          {day}
        </span>
        <button
          type="button"
          aria-label={`Add task on ${date}`}
          onClick={() => onAddTask(date)}
          className="rounded px-1 text-xs text-ink-faint opacity-0 hover:bg-paper hover:text-ink group-hover:opacity-100 focus-visible:opacity-100"
        >
          +
        </button>
      </div>
      <div className="mt-1 space-y-0.5">
        {events.map((e) => (
          <Link
            key={`${e.source}-${e.to}-${e.id}`}
            to={e.to}
            className="flex items-center gap-1 rounded px-1 py-0.5 text-xs hover:bg-paper"
          >
            <span
              aria-hidden
              className={`size-1.5 shrink-0 rounded-full ${e.status ? STATUS_DOT[e.status] : 'bg-ink-faint'}`}
            />
            <span className="truncate text-ink-soft">{e.label}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}

export function Calendar() {
  const { data, isPending, isError, error } = useFinanceData()
  const [month, setMonth] = useState(monthKey())
  const [addingTaskOn, setAddingTaskOn] = useState<string | null>(null)

  if (isPending) return <LoadingScreen />
  if (isError || !data) return <LoadError error={error} />

  const [year, monthNum] = month.split('-').map(Number)
  const grid = monthGrid(year, monthNum)
  const { start: monthStart, end: monthEnd } = monthWindow(month)
  const gridStart = grid[0]
  const gridEnd = grid[grid.length - 1]

  const events = eventsInRange(data, gridStart, gridEnd)
  const byDate = new Map<string, CalendarEvent[]>()
  for (const event of events) {
    const list = byDate.get(event.date)
    if (list) list.push(event)
    else byDate.set(event.date, [event])
  }

  // isoDate, not `new Date().toISOString()`: the latter is UTC and can name
  // the wrong day depending on the viewer's timezone — this codebase has
  // isoDate specifically to avoid that class of bug.
  const today = monthKey() === month ? isoDate() : ''
  const monthLabel = new Date(year, monthNum - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Calendar</h1>
          <p className="mt-1 text-sm text-ink-soft">{monthLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <SecondaryButton type="button" onClick={() => setMonth(addMonths(month, -1))}>
            ←
          </SecondaryButton>
          <SecondaryButton type="button" onClick={() => setMonth(monthKey())}>
            Today
          </SecondaryButton>
          <SecondaryButton type="button" onClick={() => setMonth(addMonths(month, 1))}>
            →
          </SecondaryButton>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {WEEKDAY_LABEL.map((label) => (
          <div key={label} className="text-center text-xs font-semibold text-ink-faint uppercase">
            {label}
          </div>
        ))}
        {grid.map((date) => (
          <CalendarDay
            key={date}
            date={date}
            inMonth={date >= monthStart && date <= monthEnd}
            isToday={date === today}
            events={byDate.get(date) ?? []}
            onAddTask={setAddingTaskOn}
          />
        ))}
      </div>

      {addingTaskOn && (
        <AddTaskModal open initialDate={addingTaskOn} onClose={() => setAddingTaskOn(null)} />
      )}
    </div>
  )
}
