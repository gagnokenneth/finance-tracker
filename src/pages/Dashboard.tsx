import { useFinanceData } from '../hooks/useFinanceData.ts'
import { duePages } from '../lib/dashboard.ts'
import type { DueItem } from '../lib/dashboard.ts'
import { Money } from '../components/Money.tsx'
import { CardRow } from '../components/CardRow.tsx'
import { DueBadge } from '../components/DueBadge.tsx'
import { LoadError } from '../components/LoadError.tsx'
import { LoadingScreen } from '../components/LoadingScreen.tsx'

function DueRow({ item }: { item: DueItem }) {
  return (
    <CardRow to={item.to} pending={false}>
      <div className="flex items-start justify-between gap-4">
        <span className="font-semibold tracking-tight text-ink">{item.label}</span>
        {item.amount !== undefined && (
          <Money value={item.amount} className="text-base font-semibold" />
        )}
      </div>
      <p className="mt-1 text-xs font-semibold tracking-wide text-ink-faint uppercase">
        {item.kind === 'bill' ? 'Bill' : 'Debt'}
      </p>
      <div className="mt-4 flex items-center gap-2 text-xs text-ink-faint">
        <span>Due</span>
        <DueBadge dueDate={item.dueDate} />
      </div>
    </CardRow>
  )
}

function Section({ title, items }: { title: string; items: DueItem[] }) {
  if (items.length === 0) return null
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold tracking-tight text-ink">{title}</h2>
      <div className="space-y-3">
        {items.map((item) => (
          <DueRow key={`${item.kind}-${item.id}`} item={item} />
        ))}
      </div>
    </div>
  )
}

export function Dashboard() {
  const { data, isPending, isError, error } = useFinanceData()

  if (isPending) return <LoadingScreen />
  if (isError || !data) return <LoadError error={error} />

  const { late, dueSoon } = duePages(data)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Dashboard</h1>
        <p className="mt-1 text-sm text-ink-soft">What needs attention across bills and debts.</p>
      </div>

      {late.length === 0 && dueSoon.length === 0 ? (
        <div className="rounded-xl border border-dashed border-edge bg-white p-12 text-center">
          <p className="font-medium text-ink">Nothing due soon or late</p>
          <p className="mt-1 text-sm text-ink-soft">Everything on Bills and Debts is on track.</p>
        </div>
      ) : (
        <div className="space-y-8">
          <Section title="Late" items={late} />
          <Section title="Due soon" items={dueSoon} />
        </div>
      )}
    </div>
  )
}
