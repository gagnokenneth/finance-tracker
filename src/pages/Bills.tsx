import { useState } from 'react'
import { useFinanceData } from '../hooks/useFinanceData.ts'
import { billBadges, unpaidTotal, upcomingPayable } from '../lib/bills.ts'
import { isTemp } from '../lib/tempId.ts'
import { Money } from '../components/Money.tsx'
import { PendingBadge } from '../components/PendingBadge.tsx'
import { BrutalButton, BrutalCardRow, BrutalEmptyState, BrutalPageHeader } from '../components/brutal.tsx'
import { BrutalDueBadge, BrutalTag } from '../components/brutalData.tsx'
import { LoadError } from '../components/LoadError.tsx'
import { LoadingScreen } from '../components/LoadingScreen.tsx'
import { AddBillModal } from './bills/AddBillModal.tsx'
import type { Bill, FinanceData } from '../types.ts'

function BillRow({ bill, data }: { bill: Bill; data: FinanceData }) {
  const upcoming = upcomingPayable(data.bill_payables, bill.id)
  const pending = isTemp(bill.id)

  return (
    <BrutalCardRow to={`/bills/${bill.id}`} pending={pending} className="block space-y-4 p-6">
      <div className="flex items-start justify-between gap-4">
        <span className="text-lg font-bold tracking-tight text-black">{bill.name}</span>
        {upcoming?.amount !== undefined && (
          <Money value={upcoming.amount} tone="inherit" className="text-lg font-bold text-black" />
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {billBadges(bill).map((label) => (
          <BrutalTag key={label}>{label}</BrutalTag>
        ))}
      </div>

      <div className="flex items-center gap-3 font-mono text-xs text-neutral-500">
        {/* A pending bill has no id to navigate to and no saved payable, so the
            badge stands in for both. A closed bill has no next payment, so the
            tag replaces the due date rather than showing it empty. */}
        {pending ? (
          <PendingBadge />
        ) : bill.closed ? (
          <BrutalTag muted>Closed</BrutalTag>
        ) : (
          <>
            <span>Next</span>
            <BrutalDueBadge dueDate={upcoming?.due_date ?? null} />
          </>
        )}
      </div>
    </BrutalCardRow>
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
    <div className="space-y-10">
      <BrutalPageHeader
        title="Bills"
        summary={
          open > 0 && (
            <>
              <Money value={due} tone="inherit" className="font-bold" /> due across{' '}
              <span className="tnum font-mono">{open}</span> {open === 1 ? 'bill' : 'bills'}
            </>
          )
        }
        action={
          <BrutalButton type="button" onClick={() => setAdding(true)}>
            + Add bill
          </BrutalButton>
        }
      />

      {bills.length === 0 ? (
        <BrutalEmptyState title="Nothing tracked yet">
          Add rent, a utility, or a subscription to see what is due next.
        </BrutalEmptyState>
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
