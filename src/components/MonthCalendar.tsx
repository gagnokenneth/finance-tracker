import { useState } from 'react'
import { Link } from 'react-router-dom'
import { eventsInRange } from '../lib/calendar.ts'
import type { CalendarEvent } from '../lib/calendar.ts'
import { monthKey, addMonths, monthWindow, dateOn, daysInMonth, isoDate, shiftDays } from '../lib/currentMonth.ts'
import { AddTaskModal } from '../pages/tasks/AddTaskModal.tsx'
import type { RowStatus } from '../lib/debts.ts'
import { invertOnHover } from './brutal.tsx'
import type { FinanceData } from '../types.ts'

const WEEKDAY_LABEL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** An event chip's monochrome look per status, chip and square marker kept
 *  together: 'late' is the one that inverts the whole chip to black, which
 *  is why its marker is the white one. An event with no status (income,
 *  savings) reads as upcoming. */
const CHIP_STYLE: Record<RowStatus, { chip: string; marker: string; label?: string }> = {
  late: { chip: 'border-neutral-900 bg-neutral-900 text-white', marker: 'bg-white', label: 'font-semibold' },
  'due-soon': { chip: 'border-neutral-300 bg-neutral-100 text-neutral-800', marker: 'bg-black' },
  upcoming: { chip: 'border-neutral-300 bg-neutral-100 text-neutral-800', marker: 'border border-black' },
  paid: { chip: 'border-neutral-300 bg-neutral-100 text-neutral-800', marker: 'bg-neutral-500' },
}

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

function EventChip({ event }: { event: CalendarEvent }) {
  const style = CHIP_STYLE[event.status ?? 'upcoming']
  return (
    <Link
      to={event.to}
      className={`flex items-center gap-1.5 border px-1.5 py-1 font-mono text-[11px] leading-none ${invertOnHover} ${style.chip}`}
    >
      <span aria-hidden className={`inline-block size-1.5 shrink-0 ${style.marker}`} />
      <span className={`truncate ${style.label ?? ''}`}>{event.label}</span>
    </Link>
  )
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
  const day = date.slice(8, 10)
  return (
    <div
      className={`group flex min-h-24 min-w-0 flex-col border-r border-b border-black p-1 transition-colors sm:min-h-[148px] sm:p-2 [&:nth-child(7n)]:border-r-0 [&:nth-last-child(-n+7)]:border-b-0 ${
        isToday ? 'relative z-10 bg-neutral-50 shadow-md outline-2 -outline-offset-1 outline-black' : 'hover:bg-neutral-50'
      }`}
    >
      <div className="flex items-center justify-between font-mono text-xs">
        {isToday ? (
          <div className="flex items-center gap-1.5">
            <span className="tnum bg-black px-1 py-0.5 text-xs leading-none font-bold text-white sm:px-2 sm:text-sm">{day}</span>
            <span className="hidden text-[10px] font-bold tracking-widest text-neutral-900 uppercase sm:inline">Today</span>
          </div>
        ) : inMonth ? (
          <span className="tnum text-sm font-bold text-neutral-900">{day}</span>
        ) : (
          <span className="tnum text-neutral-400">{Number(day)}</span>
        )}
        {/* Hover-revealed only where hover exists: on touch there is no hover
            state, so an opacity-0 button there would be unreachable. */}
        <button
          type="button"
          aria-label={`Add task on ${date}`}
          onClick={() => onAddTask(date)}
          className={`flex size-4 shrink-0 items-center justify-center text-xs ${invertOnHover} ${
            isToday
              ? 'border border-black'
              : 'group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:hover)]:opacity-0'
          }`}
        >
          +
        </button>
      </div>
      <div className="mt-2 flex-1 space-y-1.5">
        {events.map((e) => (
          <EventChip key={`${e.source}-${e.to}-${e.id}`} event={e} />
        ))}
      </div>
    </div>
  )
}

/**
 * The month-grid calendar, embedded directly on the Dashboard rather than
 * behind its own route — one browsable view instead of a full page plus a
 * separate compact widget duplicating the same data. `data` is a prop, not
 * a useFinanceData() call of its own: the page that mounts this already
 * holds it, the same convention every modal in this app already follows.
 */
export function MonthCalendar({ data }: { data: FinanceData }) {
  const [month, setMonth] = useState(monthKey())
  const [addingTaskOn, setAddingTaskOn] = useState<string | null>(null)

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
  const todayWeekday = today ? new Date().getDay() : -1
  const monthLabel = new Date(year, monthNum - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="flex flex-col">
      <div className="mb-2 flex flex-col items-start justify-between gap-4 border-b border-black pb-6 sm:flex-row sm:items-center">
        <h1 className="text-3xl font-bold tracking-tight text-black uppercase sm:text-4xl md:text-5xl">
          {monthLabel}
        </h1>
        <div className="inline-flex border border-black font-mono text-xs">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => setMonth(addMonths(month, -1))}
            className={`px-3 py-1.5 ${invertOnHover}`}
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => setMonth(monthKey())}
            className={`border-x border-black px-4 py-1.5 font-bold tracking-wider uppercase ${invertOnHover}`}
          >
            Today
          </button>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => setMonth(addMonths(month, 1))}
            className={`px-3 py-1.5 ${invertOnHover}`}
          >
            →
          </button>
        </div>
      </div>

      <div className="w-full border border-black bg-white shadow-sm">
        <div className="grid grid-cols-7 divide-x divide-black border-b border-black bg-neutral-100 font-mono text-xs font-bold tracking-wider uppercase">
          {WEEKDAY_LABEL.map((label, i) => (
            <div
              key={label}
              className={`px-1.5 py-2.5 sm:px-3 ${i === 0 || i === 6 ? 'text-neutral-500' : 'text-neutral-900'} ${
                i === todayWeekday ? 'bg-neutral-200' : ''
              }`}
            >
              {label}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 text-xs">
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
      </div>

      {addingTaskOn && (
        <AddTaskModal open data={data} initialDate={addingTaskOn} onClose={() => setAddingTaskOn(null)} />
      )}
    </div>
  )
}
