import { Link } from 'react-router-dom'
import { useFinanceData } from '../hooks/useFinanceData.ts'
import { duePages } from '../lib/dashboard.ts'
import type { DueItem } from '../lib/dashboard.ts'
import { eventsInRange, STATUS_DOT } from '../lib/calendar.ts'
import { isoDate, dateOn } from '../lib/currentMonth.ts'
import { Card } from '../components/Card.tsx'
import { DueCard } from '../components/DueCard.tsx'
import { EmptyState } from '../components/EmptyState.tsx'
import { LoadError } from '../components/LoadError.tsx'
import { LoadingScreen } from '../components/LoadingScreen.tsx'

function Section({ title, items }: { title: string; items: DueItem[] }) {
  if (items.length === 0) return null
  return (
    <Card title={title}>
      <div className="space-y-2">
        {items.map((item) => (
          <DueCard key={`${item.kind}-${item.id}`} item={item} />
        ))}
      </div>
    </Card>
  )
}

export function Dashboard() {
  const { data, isPending, isError, error } = useFinanceData()

  if (isPending) return <LoadingScreen />
  if (isError || !data) return <LoadError error={error} />

  const { late, dueSoon } = duePages(data)
  // Today through a week out — see Calendar.tsx for the full, unrestricted
  // browsable view. This window is intentionally short: Dashboard's job is
  // "what's coming up", not a second calendar.
  const today = isoDate()
  const weekOut = dateOn(
    Number(today.slice(0, 4)),
    Number(today.slice(5, 7)),
    Number(today.slice(8, 10)) + 7,
  )
  const upcoming = eventsInRange(data, today, weekOut).sort((a, b) => a.date.localeCompare(b.date))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Dashboard</h1>
        <p className="mt-1 text-sm text-ink-soft">What needs attention across bills and debts.</p>
      </div>

      {late.length === 0 && dueSoon.length === 0 ? (
        <EmptyState title="Nothing due soon or late">
          Everything on Bills and Debts is on track.
        </EmptyState>
      ) : (
        <div className="space-y-8">
          <Section title="Late" items={late} />
          <Section title="Due soon" items={dueSoon} />
        </div>
      )}

      {upcoming.length > 0 && (
        <Card title="Upcoming">
          <div className="space-y-1">
            {upcoming.map((e) => (
              <Link
                key={`${e.source}-${e.id}`}
                to={e.to}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-paper"
              >
                <span
                  aria-hidden
                  className={`size-1.5 shrink-0 rounded-full ${e.status ? STATUS_DOT[e.status] : 'bg-ink-faint'}`}
                />
                <span className="tnum font-mono text-xs text-ink-faint">{e.date}</span>
                <span className="truncate text-ink">{e.label}</span>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
