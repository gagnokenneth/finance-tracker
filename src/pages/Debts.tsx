import { useState } from 'react'
import { useFinanceData } from '../hooks/useFinanceData.ts'
import { nextDueDate, scheduleFor, statementsFor, totalBalance } from '../lib/debts.ts'
import { isTemp } from '../lib/tempId.ts'
import { Money } from '../components/Money.tsx'
import { PendingBadge } from '../components/PendingBadge.tsx'
import { BrutalButton, BrutalCardRow, BrutalEmptyState, BrutalPageHeader } from '../components/brutal.tsx'
import { BrutalDueBadge, BrutalInstallmentStrip } from '../components/brutalData.tsx'
import { LoadError } from '../components/LoadError.tsx'
import { LoadingScreen } from '../components/LoadingScreen.tsx'
import { AddDebtModal } from './debts/AddDebtModal.tsx'
import type { Debt, FinanceData } from '../types.ts'

function DebtRow({ debt, data }: { debt: Debt; data: FinanceData }) {
  const rows =
    debt.type === 'fixed' ? scheduleFor(data.debt_schedule, debt.id) : statementsFor(data.debt_statements, debt.id)
  const paid = rows.filter((r) => r.paid).length
  const pending = isTemp(debt.id)

  return (
    <BrutalCardRow to={`/debts/${debt.id}`} pending={pending} className="block space-y-4 p-6">
      <div className="flex items-start justify-between gap-4">
        <span className="text-lg font-bold tracking-tight text-black">{debt.name}</span>
        <Money
          value={totalBalance(debt, data.debt_schedule, data.debt_statements)}
          tone="inherit"
          className="text-lg font-bold text-black"
        />
      </div>

      {debt.type === 'fixed' ? (
        <BrutalInstallmentStrip kind="fixed" paid={paid} total={rows.length} />
      ) : (
        <BrutalInstallmentStrip kind="revolving" paid={paid} />
      )}

      <div className="flex items-center gap-3 font-mono text-xs text-neutral-500">
        {pending ? (
          <PendingBadge />
        ) : (
          <>
            <span>Next</span>
            <BrutalDueBadge dueDate={nextDueDate(debt, data.debt_schedule, data.debt_statements)} />
          </>
        )}
      </div>
    </BrutalCardRow>
  )
}

export function Debts() {
  const { data, isPending, isError, error } = useFinanceData()
  const [adding, setAdding] = useState(false)

  if (isPending) return <LoadingScreen />
  if (isError || !data) return <LoadError error={error} />

  const owed = data.debts.reduce((sum, d) => sum + totalBalance(d, data.debt_schedule, data.debt_statements), 0)

  return (
    <div className="space-y-10">
      <BrutalPageHeader
        title="Debts"
        summary={
          data.debts.length > 0 && (
            <>
              <Money value={owed} tone="inherit" className="font-bold" /> left across{' '}
              <span className="tnum font-mono">{data.debts.length}</span> {data.debts.length === 1 ? 'debt' : 'debts'}
            </>
          )
        }
        action={
          <BrutalButton type="button" onClick={() => setAdding(true)}>
            + Add debt
          </BrutalButton>
        }
      />

      {data.debts.length === 0 ? (
        <BrutalEmptyState title="Nothing tracked yet">
          Add a loan or a credit card to start counting down payments.
        </BrutalEmptyState>
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
