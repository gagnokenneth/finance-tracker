import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useFinanceData } from '../hooks/useFinanceData.ts'
import { nextDueDate, scheduleFor, statementsFor, totalBalance } from '../lib/debts.ts'
import { Money } from '../components/Money.tsx'
import { DueBadge } from '../components/DueBadge.tsx'
import { InstallmentStrip } from '../components/InstallmentStrip.tsx'
import { Button } from '../components/ui.tsx'
import { AddDebtModal } from './debts/AddDebtModal.tsx'
import type { Debt, FinanceData } from '../types.ts'

function DebtRow({ debt, data }: { debt: Debt; data: FinanceData }) {
  const rows =
    debt.type === 'fixed'
      ? scheduleFor(data.debt_schedule, debt.id)
      : statementsFor(data.debt_statements, debt.id)
  const paid = rows.filter((r) => r.paid).length

  return (
    <Link
      to={`/debts/${debt.id}`}
      className="block rounded-xl border border-edge bg-white p-5 transition-shadow hover:shadow-md hover:shadow-ink/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      <div className="flex items-start justify-between gap-4">
        <span className="font-semibold tracking-tight text-ink">{debt.name}</span>
        <Money
          value={totalBalance(debt, data.debt_schedule, data.debt_statements)}
          className="text-base font-semibold"
        />
      </div>

      <div className="mt-4">
        {debt.type === 'fixed' ? (
          <InstallmentStrip kind="fixed" paid={paid} total={rows.length} />
        ) : (
          <InstallmentStrip kind="revolving" paid={paid} />
        )}
      </div>

      <div className="mt-4 flex items-center gap-2 text-xs text-ink-faint">
        <span>Next</span>
        <DueBadge dueDate={nextDueDate(debt, data.debt_schedule, data.debt_statements)} />
      </div>
    </Link>
  )
}

export function Debts() {
  const { data, isLoading, isError } = useFinanceData()
  const [adding, setAdding] = useState(false)

  if (isLoading) return <p className="text-ink-soft">Loading…</p>
  if (isError || !data) return <p className="text-overdue">Could not load your debts. Reload to try again.</p>

  const owed = data.debts.reduce(
    (sum, d) => sum + totalBalance(d, data.debt_schedule, data.debt_statements),
    0,
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Debts</h1>
          {data.debts.length > 0 && (
            <p className="mt-1 text-sm text-ink-soft">
              <Money value={owed} className="font-semibold" /> left across{' '}
              <span className="tnum font-mono">{data.debts.length}</span>{' '}
              {data.debts.length === 1 ? 'debt' : 'debts'}
            </p>
          )}
        </div>
        <Button type="button" onClick={() => setAdding(true)}>
          Add debt
        </Button>
      </div>

      {data.debts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-edge bg-white p-12 text-center">
          <p className="font-medium text-ink">Nothing tracked yet</p>
          <p className="mt-1 text-sm text-ink-soft">
            Add a loan or a credit card to start counting down payments.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.debts.map((d) => (
            <DebtRow key={d.id} debt={d} data={data} />
          ))}
        </div>
      )}

      {/* Mounted only while open, so the form resets without a manual reset(). */}
      {adding && <AddDebtModal open onClose={() => setAdding(false)} />}
    </div>
  )
}
