import { useState } from 'react'
import { Link } from 'react-router-dom'
import { eventsInRange } from '../lib/calendar.ts'
import type { CalendarEvent } from '../lib/calendar.ts'
import { monthKey, addMonths, monthWindow, monthGrid, monthLabel, dayLabel, isoDate, WEEKDAY_SHORT } from '../lib/currentMonth.ts'
import { AddTaskModal } from '../pages/tasks/AddTaskModal.tsx'
import type { RowStatus } from '../lib/debts.ts'
import { focusRing, invertOnHover, smallButtonBase } from './brutal.tsx'
import type { FinanceData } from '../types.ts'

/** An event chip's monochrome look per status, chip and square marker kept
 *  together: 'late' is the one that inverts the whole chip to black, which
 *  is why its marker is the white one. An event with no status (income,
 *  savings) reads as upcoming. */
const CHIP_STYLE: Record<RowStatus, { chip: string; marker: string; dot?: string; label?: string }> = {
  // `dot` is the marker on a bare phone-width cell, where late's white one
  // would vanish — ringed to set it apart from due-soon's solid square.
  late: {
    chip: 'border-neutral-900 bg-neutral-900 text-white',
    marker: 'bg-white',
    dot: 'bg-black outline-1 outline-offset-1 outline-black',
    label: 'font-semibold',
  },
  'due-soon': { chip: 'border-neutral-300 bg-neutral-100 text-neutral-800', marker: 'bg-black' },
  upcoming: { chip: 'border-neutral-300 bg-neutral-100 text-neutral-800', marker: 'border border-black' },
  paid: { chip: 'border-neutral-300 bg-neutral-100 text-neutral-800', marker: 'bg-neutral-500' },
}

const eventKey = (e: CalendarEvent) => `${e.source}-${e.to}-${e.id}`

function cellDot(e: CalendarEvent): string {
  const style = CHIP_STYLE[e.status ?? 'upcoming']
  return style.dot ?? style.marker
}

/** Shared by every empty day, so their cells keep a stable prop. */
const NO_EVENTS: CalendarEvent[] = []

/** `large` is the phone agenda's size, where the chip is a finger's tap target. */
function EventChip({ event, large = false }: { event: CalendarEvent; large?: boolean }) {
  const style = CHIP_STYLE[event.status ?? 'upcoming']
  const size = large ? 'gap-2.5 px-3 py-3 text-xs' : 'gap-1.5 px-1.5 py-1 text-[11px]'
  return (
    <Link
      to={event.to}
      className={`flex items-center border font-mono leading-none focus-visible:outline-offset-2 ${focusRing} ${size} ${invertOnHover} ${style.chip}`}
    >
      <span aria-hidden className={`inline-block size-1.5 shrink-0 ${style.marker}`} />
      <span className={`truncate ${style.label ?? ''}`}>{event.label}</span>
    </Link>
  )
}

/** How many markers a phone-width day shows before summing the rest. */
const MOBILE_MARKER_LIMIT = 4

function CalendarDay({
  date,
  inMonth,
  isToday,
  isSelected,
  events,
  onAddTask,
  onSelect,
}: {
  date: string
  inMonth: boolean
  isToday: boolean
  isSelected: boolean
  events: CalendarEvent[]
  onAddTask: (date: string) => void
  onSelect: (date: string) => void
}) {
  const day = date.slice(8, 10)
  const extra = events.length - MOBILE_MARKER_LIMIT
  return (
    <div
      className={`group relative flex min-h-16 min-w-0 flex-col border-r border-b border-black p-1 transition-colors sm:min-h-[148px] sm:p-2 [&:nth-child(7n)]:border-r-0 [&:nth-last-child(-n+7)]:border-b-0 ${
        isToday ? 'z-10 bg-neutral-50 shadow-md outline-2 -outline-offset-1 outline-black' : 'hover:bg-neutral-50'
      } ${isSelected && !isToday ? 'max-sm:bg-neutral-200' : ''}`}
    >
      {/* Below sm a day is too narrow for chips, so the whole cell is one
          button that lists its events under the grid instead. */}
      <button
        type="button"
        aria-label={`Show ${dayLabel(date)}, ${events.length} ${events.length === 1 ? 'event' : 'events'}`}
        aria-pressed={isSelected}
        onClick={() => onSelect(date)}
        className={`absolute inset-0 focus-visible:-outline-offset-2 sm:hidden ${focusRing}`}
      />
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
          className={`hidden size-4 shrink-0 items-center justify-center text-xs sm:flex ${invertOnHover} ${
            isToday
              ? 'border border-black'
              : 'group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:hover)]:opacity-0'
          }`}
        >
          +
        </button>
      </div>
      <div className="mt-2 hidden flex-1 space-y-1.5 sm:block">
        {events.map((e) => (
          <EventChip key={eventKey(e)} event={e} />
        ))}
      </div>
      <div aria-hidden className="mt-1.5 flex flex-wrap items-center gap-1 sm:hidden">
        {events.slice(0, MOBILE_MARKER_LIMIT).map((e) => (
          <span key={eventKey(e)} className={`inline-block size-1.5 ${cellDot(e)}`} />
        ))}
        {extra > 0 && <span className="font-mono text-[9px] leading-none text-neutral-600">+{extra}</span>}
      </div>
    </div>
  )
}

/** The phone-width stand-in for the chips: the tapped day's events, full width. */
function DayAgenda({
  date,
  events,
  onAddTask,
}: {
  date: string
  events: CalendarEvent[]
  onAddTask: (date: string) => void
}) {
  return (
    <section aria-label={dayLabel(date)} className="mt-4 border border-black bg-white sm:hidden">
      <div className="flex items-center justify-between gap-2 border-b border-black bg-neutral-100 px-3 py-2.5">
        <h2 className="font-mono text-xs font-bold tracking-wider uppercase">{dayLabel(date)}</h2>
        <button
          type="button"
          onClick={() => onAddTask(date)}
          className={`${smallButtonBase} shrink-0 px-3 py-2`}
        >
          Add task
        </button>
      </div>
      {events.length === 0 ? (
        <p className="px-3 py-4 font-mono text-xs text-neutral-500">Nothing due or scheduled on this day.</p>
      ) : (
        <div className="space-y-2 p-3">
          {events.map((e) => (
            <EventChip key={eventKey(e)} event={e} large />
          ))}
        </div>
      )}
    </section>
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
  const [selected, setSelected] = useState(isoDate())

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

  // Changing month moves the phone agenda along with it: to today when
  // landing back on the current month, otherwise to the 1st.
  const goTo = (next: string) => {
    setMonth(next)
    setSelected(next === monthKey() ? isoDate() : monthWindow(next).start)
  }

  return (
    <div className="flex flex-col">
      <div className="mb-2 flex flex-col items-start justify-between gap-4 border-b border-black pb-6 sm:flex-row sm:items-center">
        <h1 className="text-3xl font-bold tracking-tight text-black uppercase sm:text-4xl md:text-5xl">
          {monthLabel(month)}
        </h1>
        <div className="inline-flex border border-black font-mono text-xs">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => goTo(addMonths(month, -1))}
            className={`px-4 py-2.5 sm:px-3 sm:py-1.5 ${invertOnHover}`}
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => goTo(monthKey())}
            className={`border-x border-black px-5 py-2.5 font-bold tracking-wider uppercase sm:px-4 sm:py-1.5 ${invertOnHover}`}
          >
            Today
          </button>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => goTo(addMonths(month, 1))}
            className={`px-4 py-2.5 sm:px-3 sm:py-1.5 ${invertOnHover}`}
          >
            →
          </button>
        </div>
      </div>

      <div className="w-full border border-black bg-white shadow-sm">
        <div className="grid grid-cols-7 divide-x divide-black border-b border-black bg-neutral-100 font-mono text-xs font-bold tracking-wider uppercase">
          {WEEKDAY_SHORT.map((label, i) => (
            <div
              key={label}
              className={`px-1 py-2.5 text-center sm:px-3 sm:text-left ${i === 0 || i === 6 ? 'text-neutral-500' : 'text-neutral-900'} ${
                i === todayWeekday ? 'bg-neutral-200' : ''
              }`}
            >
              <span className="sm:hidden">{label[0]}</span>
              <span className="hidden sm:inline">{label}</span>
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
              isSelected={date === selected}
              events={byDate.get(date) ?? NO_EVENTS}
              onAddTask={setAddingTaskOn}
              onSelect={setSelected}
            />
          ))}
        </div>
      </div>

      <DayAgenda date={selected} events={byDate.get(selected) ?? NO_EVENTS} onAddTask={setAddingTaskOn} />

      {addingTaskOn && (
        <AddTaskModal open data={data} initialDate={addingTaskOn} onClose={() => setAddingTaskOn(null)} />
      )}
    </div>
  )
}
