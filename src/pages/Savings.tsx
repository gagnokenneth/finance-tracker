import { useState } from 'react'
import { useFinanceData } from '../hooks/useFinanceData.ts'
import { useFinanceMutations } from '../hooks/useFinanceMutations.ts'
import {
  savingsBalance,
  balanceAsOf,
  futureRows,
  runningBalances,
  isPaymentKind,
  byDateDesc,
  SAVINGS_KIND_LABEL,
} from '../lib/savings.ts'
import { monthKey, monthLabel, addMonths, inMonth } from '../lib/currentMonth.ts'
import { isTemp } from '../lib/tempId.ts'
import { Money } from '../components/Money.tsx'
import {
  BrutalButton,
  BrutalConfirm,
  BrutalEmptyState,
  BrutalPageHeader,
  BrutalStepper,
} from '../components/brutal.tsx'
import { BrutalFigure, BrutalRowActions, BrutalStat, BrutalStatPanel, BrutalTable, cellClass } from '../components/brutalData.tsx'
import { LoadError } from '../components/LoadError.tsx'
import { LoadingScreen } from '../components/LoadingScreen.tsx'
import { SavingsFormModal } from './savings/SavingsFormModal.tsx'
import type { SavingsLedgerEntry } from '../types.ts'

export function Savings() {
  const { data, isPending, isError, error } = useFinanceData()
  const { deleteSavingsEntry } = useFinanceMutations()
  const [month, setMonth] = useState(monthKey())
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<SavingsLedgerEntry | null>(null)
  const [deleting, setDeleting] = useState<SavingsLedgerEntry | null>(null)

  if (isPending) return <LoadingScreen />
  if (isError || !data) return <LoadError error={error} />

  /*
   * The headline balance is money you actually HAVE: rows whose date has
   * arrived. A deposit recorded for a future payday is disclosed separately
   * rather than counted, because counting it would both overstate the card and
   * let it fund a withdrawal today — the backend guard uses the same rule.
   *
   * Unaffected by which month is displayed; the running balances are computed
   * over every row for the same reason.
   */
  const balance = balanceAsOf(data.savings_ledger)
  const later = futureRows(data.savings_ledger)
  const laterTotal = savingsBalance(later)
  const balances = runningBalances(data.savings_ledger)
  // inMonth's order doesn't match runningBalances' accumulation order, so the
  // Balance column would read non-monotone on same-date rows; re-sort to the
  // exact reverse of the accumulation order instead.
  const rows = [...inMonth(data.savings_ledger, month)].sort(byDateDesc)
  // Same sum as the balance, over the month's rows rather than all of them.
  const net = savingsBalance(rows)
  const label = monthLabel(month)

  return (
    <div className="space-y-10">
      <BrutalPageHeader
        title="Savings"
        summary={
          <>
            <Money value={net} className="font-bold" /> net in {label}
          </>
        }
        action={
          <BrutalButton type="button" onClick={() => setAdding(true)}>
            + Add movement
          </BrutalButton>
        }
      />

      <BrutalStatPanel>
        <BrutalStat label="Balance">
          <Money value={balance} className="text-4xl font-bold" />
          {later.length > 0 && (
            <p className="mt-3 font-mono text-xs text-neutral-500">
              <Money value={laterTotal} /> dated later, not counted yet
            </p>
          )}
        </BrutalStat>
      </BrutalStatPanel>

      <BrutalStepper
        label={label}
        unit="month"
        onPrev={() => setMonth(addMonths(month, -1))}
        onNext={() => setMonth(addMonths(month, 1))}
      />

      {rows.length === 0 ? (
        <BrutalEmptyState title={`Nothing moved in ${label}`}>
          Add a deposit, or step back a month to see earlier movements.
        </BrutalEmptyState>
      ) : (
        <BrutalTable columns={['Date', 'Kind', 'Amount', 'Balance', 'Notes']} actions>
          {rows.map((row) => (
            <tr key={row.id}>
              <td className={`tnum ${cellClass} font-mono`}>{row.date}</td>
              <td className={`${cellClass} font-bold`}>{SAVINGS_KIND_LABEL[row.kind]}</td>
              <td className={cellClass}>
                <BrutalFigure value={row.amount} />
              </td>
              <td className={`${cellClass} text-neutral-500`}>
                <Money value={balances.get(row.id) ?? 0} />
              </td>
              <td className={`${cellClass} font-mono text-xs text-neutral-500`}>{row.notes ?? ''}</td>
              <td className={cellClass}>
                {/* A payment row belongs to the bill or debt it settled. */}
                <BrutalRowActions
                  pending={isTemp(row.id)}
                  locked={isPaymentKind(row.kind) ? 'From a payment' : undefined}
                  onEdit={() => setEditing(row)}
                  onDelete={() => setDeleting(row)}
                />
              </td>
            </tr>
          ))}
        </BrutalTable>
      )}

      {/* Mounted only while open, so each form resets without a manual reset(). */}
      {adding && (
        <SavingsFormModal
          look="grid"
          month={month}
          onClose={() => setAdding(false)}
          onMonthChange={setMonth}
        />
      )}
      {editing && (
        <SavingsFormModal
          look="plain"
          entry={editing}
          onClose={() => setEditing(null)}
          onMonthChange={setMonth}
        />
      )}
      <BrutalConfirm
        open={deleting !== null}
        title="Delete movement"
        message={
          deleting
            ? `${SAVINGS_KIND_LABEL[deleting.kind]} on ${deleting.date}. This cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        onConfirm={() => {
          if (deleting) deleteSavingsEntry.mutate(deleting.id)
          setDeleting(null)
        }}
        onClose={() => setDeleting(null)}
      />
    </div>
  )
}
