import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useFinanceData } from '../hooks/useFinanceData.ts'
import { billCaption, unpaidTotal, upcomingPayable } from '../lib/bills.ts'
import { Money } from '../components/Money.tsx'
import { DueBadge } from '../components/DueBadge.tsx'
import { Button } from '../components/ui.tsx'
import { LoadError } from '../components/LoadError.tsx'
import { LoadingScreen } from '../components/LoadingScreen.tsx'
import { AddBillModal } from './bills/AddBillModal.tsx'
import type { Bill, FinanceData } from '../types.ts'

function BillRow({ bill, data }: { bill: Bill; data: FinanceData }) {
  const upcoming = upcomingPayable(data.bill_payables, bill.id)

  return (
    <Link
      to={`/bills/${bill.id}`}
      className="block rounded-xl border border-edge bg-white p-5 transition-shadow hover:shadow-md hover:shadow-ink/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      <div className="flex items-start justify-between gap-4">
        <span className="font-semibold tracking-tight text-ink">{bill.name}</span>
        {upcoming?.amount !== undefined && (
          <Money value={upcoming.amount} className="text-base font-semibold" />
        )}
      </div>

      <p className="mt-1 text-xs font-semibold tracking-wide text-ink-faint uppercase">
        {billCaption(bill)}
      </p>

      <div className="mt-4 flex items-center gap-2 text-xs text-ink-faint">
        {/* A closed bill has no next payment, so the badge is replaced rather
            than shown empty. Inlined instead of added to StatusBadge, which is
            keyed to a row's due state — and closed is a bill's state. */}
        {bill.closed ? (
          <span className="inline-flex items-center rounded-full bg-paper px-2 py-0.5 text-xs font-medium text-ink-soft ring-1 ring-ink-faint/30 ring-inset">
            Closed
          </span>
        ) : (
          <>
            <span>Next</span>
            <DueBadge dueDate={upcoming?.due_date ?? null} />
          </>
        )}
      </div>
    </Link>
  )
}

export function Bills() {
  const { data, isPending, isError, error } = useFinanceData()
  const [adding, setAdding] = useState(false)

  if (isPending) return <LoadingScreen />
  if (isError || !data) return <LoadError error={error} />

  const due = unpaidTotal(data.bill_payables)
  // Closed bills are history: kept visible, but below the ones still running.
  const bills = [...data.bills].sort((a, b) => Number(a.closed) - Number(b.closed))
  const open = data.bills.filter((b) => !b.closed).length

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Bills</h1>
          {open > 0 && (
            <p className="mt-1 text-sm text-ink-soft">
              <Money value={due} className="font-semibold" /> due across{' '}
              <span className="tnum font-mono">{open}</span> {open === 1 ? 'bill' : 'bills'}
            </p>
          )}
        </div>
        <Button type="button" onClick={() => setAdding(true)}>
          Add bill
        </Button>
      </div>

      {bills.length === 0 ? (
        <div className="rounded-xl border border-dashed border-edge bg-white p-12 text-center">
          <p className="font-medium text-ink">Nothing tracked yet</p>
          <p className="mt-1 text-sm text-ink-soft">
            Add rent, a utility, or a subscription to see what is due next.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {bills.map((b) => (
            <BillRow key={b.id} bill={b} data={data} />
          ))}
        </div>
      )}

      {/* Mounted only while open, so the form resets without a manual reset(). */}
      {adding && <AddBillModal open onClose={() => setAdding(false)} />}
    </div>
  )
}
