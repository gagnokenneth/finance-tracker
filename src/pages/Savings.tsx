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
} from '../lib/savings.ts'
import { monthKey, addMonths, inMonth } from '../lib/currentMonth.ts'
import { isTemp } from '../lib/tempId.ts'
import { Money } from '../components/Money.tsx'
import { Card } from '../components/Card.tsx'
import { Table } from '../components/Table.tsx'
import { Button, SecondaryButton, RowButton } from '../components/ui.tsx'
import { ConfirmDialog } from '../components/ConfirmDialog.tsx'
import { PendingBadge } from '../components/PendingBadge.tsx'
import { EmptyState } from '../components/EmptyState.tsx'
import { LoadError } from '../components/LoadError.tsx'
import { LoadingScreen } from '../components/LoadingScreen.tsx'
import { SavingsFormModal } from './savings/SavingsFormModal.tsx'
import type { SavingsLedgerEntry, SavingsLedgerKind } from '../types.ts'

/* Keyed to the union, not string: a fifth kind becomes a compile error here
   rather than a raw enum value leaking into the table. */
const KIND_LABEL: Record<SavingsLedgerKind, string> = {
  deposit: 'Deposit',
  withdrawal: 'Withdrawal',
  bill_payment: 'Bill payment',
  debt_payment: 'Debt payment',
}

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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Savings</h1>
          <p className="mt-1 text-sm text-ink-soft">
            <Money value={net} className="font-semibold" /> net in{' '}
            <span className="tnum font-mono">{month}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SecondaryButton type="button" onClick={() => setMonth(addMonths(month, -1))}>
            ←
          </SecondaryButton>
          <SecondaryButton type="button" onClick={() => setMonth(addMonths(month, 1))}>
            →
          </SecondaryButton>
          <Button type="button" onClick={() => setAdding(true)}>
            Add movement
          </Button>
        </div>
      </div>

      <Card title="Balance">
        <Money value={balance} className="text-3xl font-bold" />
        {later.length > 0 && (
          <p className="mt-2 text-xs text-ink-faint">
            <Money value={laterTotal} /> dated later, not counted yet
          </p>
        )}
      </Card>

      {rows.length === 0 ? (
        <EmptyState title={`Nothing moved in ${month}`}>
          Add a deposit, or step back a month to see earlier movements.
        </EmptyState>
      ) : (
        <Table headers={['Date', 'Kind', 'Amount', 'Balance', 'Notes', '']}>
          {rows.map((row) => {
            const payment = isPaymentKind(row.kind)
            const pending = isTemp(row.id)
            return (
              <tr key={row.id}>
                <td className="px-4 py-3">{row.date}</td>
                <td className="px-4 py-3">
                  {KIND_LABEL[row.kind]}
                  {pending && <PendingBadge />}
                </td>
                <td className="px-4 py-3">
                  <Money value={row.amount} />
                </td>
                <td className="px-4 py-3 text-ink-soft">
                  <Money value={balances.get(row.id) ?? 0} />
                </td>
                <td className="px-4 py-3 text-ink-faint">{row.notes ?? ''}</td>
                <td className="px-4 py-3 text-right">
                  {/* A payment row belongs to the bill or debt it settled, so it
                      is read-only here. No such row exists until FT-4. */}
                  {payment ? (
                    <span className="text-xs text-ink-faint">From a payment</span>
                  ) : (
                    <span className="flex justify-end gap-2">
                      <RowButton onClick={() => setEditing(row)} disabled={pending}>
                        Edit
                      </RowButton>
                      <RowButton tone="danger" onClick={() => setDeleting(row)} disabled={pending}>
                        Delete
                      </RowButton>
                    </span>
                  )}
                </td>
              </tr>
            )
          })}
        </Table>
      )}

      {/* Mounted only while open, so each form resets without a manual reset(). */}
      {adding && (
        <SavingsFormModal
          open
          month={month}
          onClose={() => setAdding(false)}
          onMonthChange={setMonth}
        />
      )}
      {editing && (
        <SavingsFormModal
          open
          entry={editing}
          onClose={() => setEditing(null)}
          onMonthChange={setMonth}
        />
      )}
      <ConfirmDialog
        open={deleting !== null}
        title="Delete movement?"
        message={
          deleting
            ? `${KIND_LABEL[deleting.kind]} on ${deleting.date}. This cannot be undone.`
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
