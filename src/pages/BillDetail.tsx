import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useFinanceData } from '../hooks/useFinanceData.ts'
import { useFinanceMutations } from '../hooks/useFinanceMutations.ts'
import { billBadges, payablesFor, recurrenceOf, upcomingPayable } from '../lib/bills.ts'
import { nextDueDate } from '../lib/billSchedule.ts'
import { dueStatus } from '../lib/debts.ts'
import { isTemp } from '../lib/tempId.ts'
import { balanceAsOf, paymentsByRef, refKey } from '../lib/savings.ts'
import { Money } from '../components/Money.tsx'
import { Table } from '../components/Table.tsx'
import { DueBadge } from '../components/DueBadge.tsx'
import { StatusBadge } from '../components/StatusBadge.tsx'
import { PendingBadge } from '../components/PendingBadge.tsx'
import { ConfirmDialog } from '../components/ConfirmDialog.tsx'
import { EmptyState } from '../components/EmptyState.tsx'
import { LoadError } from '../components/LoadError.tsx'
import { LoadingScreen } from '../components/LoadingScreen.tsx'
import { PayModal } from '../components/PayModal.tsx'
import type { PayResult } from '../components/PayModal.tsx'
import {
  SecondaryButton,
  RowButton,
  EditRowButton,
  DeleteRowButton,
  EditButton,
  DeleteButton,
} from '../components/ui.tsx'
import { Badge } from '../components/Badge.tsx'
import { EditBillModal } from './bills/EditBillModal.tsx'
import { PayableFormModal } from './bills/PayableFormModal.tsx'
import type { BillPayable } from '../types.ts'

const HEADERS = ['Due date', 'Amount', 'Status', '']

export function BillDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data, isPending, isError, error } = useFinanceData()
  const {
    updateBill,
    closeBill,
    deleteBill,
    updateBillPayable,
    deleteBillPayable,
    payBillPayable,
  } = useFinanceMutations()

  const [editingBill, setEditingBill] = useState(false)
  const [closingBill, setClosingBill] = useState(false)
  const [deletingBill, setDeletingBill] = useState(false)
  const [payRow, setPayRow] = useState<BillPayable | null>(null)
  const [editingRow, setEditingRow] = useState<BillPayable | null>(null)
  const [deletingRow, setDeletingRow] = useState<BillPayable | null>(null)

  if (isPending) return <LoadingScreen />
  if (isError || !data) return <LoadError error={error} />

  const billId = Number(id)
  const bill = data.bills.find((b) => b.id === billId)
  if (!bill) {
    return (
      <p className="text-ink-soft">
        That bill no longer exists.{' '}
        <Link to="/bills" className="font-medium text-brand underline underline-offset-2">
          Back to bills
        </Link>
      </p>
    )
  }

  const rows = payablesFor(data.bill_payables, bill.id)
  const upcoming = upcomingPayable(data.bill_payables, bill.id)
  const unpaidCount = rows.filter((r) => !r.paid).length
  // FT-3 wrote paymentsByRef with no callers for exactly this.
  const fundedByRef = paymentsByRef(data.savings_ledger)

  const submitPay = (result: PayResult) => {
    if (!payRow) return
    const row = payRow
    setPayRow(null)
    payBillPayable.mutate({
      id: row.id,
      input: {
        paid_date: result.paid_date,
        paid_amount: result.paid_amount,
        from_savings: result.from_savings,
        // Computed here because all four recurrence rules live in
        // lib/billSchedule.ts; the backend writes the date it is given.
        next_due_date: nextDueDate(recurrenceOf(bill), row.due_date),
      },
    })
  }

  const statusCell = (row: BillPayable) =>
    row.paid ? (
      <span className="inline-flex flex-wrap items-center gap-2">
        <StatusBadge status="paid" />
        <span className="tnum font-mono text-xs text-ink-faint">
          {row.paid_date}
          {row.paid_amount !== undefined && (
            <>
              {' · '}
              <Money value={row.paid_amount} className="text-xs !text-ink-faint" />
            </>
          )}
        </span>
        {fundedByRef.has(refKey('bill_payable', row.id)) && (
          <span className="text-xs text-ink-faint">from savings</span>
        )}
      </span>
    ) : (
      <StatusBadge status={dueStatus(row.due_date)} />
    )

  const rowActions = (row: BillPayable) => {
    // A closed bill is history: readable, and frozen.
    if (bill.closed) return null
    // A pending row has no backend id yet, so every action here would be sent
    // against an id the backend has never seen. Same treatment, for the second
    // it lasts.
    if (isTemp(row.id)) return <PendingBadge />
    const priced = row.amount !== undefined
    return (
      <div className="flex flex-wrap justify-end gap-1.5">
        {/* An unpriced row leads with Set amount because that is its actual next
            step, and keeps Pay visible but inert so the sequence stays legible. */}
        {!row.paid && !priced && (
          <RowButton tone="primary" type="button" onClick={() => setEditingRow(row)}>
            Set amount
          </RowButton>
        )}
        {!row.paid && (
          <RowButton
            tone={priced ? 'primary' : 'neutral'}
            type="button"
            disabled={!priced}
            onClick={() => setPayRow(row)}
          >
            Pay
          </RowButton>
        )}
        <EditRowButton type="button" onClick={() => setEditingRow(row)} />
        <DeleteRowButton type="button" onClick={() => setDeletingRow(row)} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Link
        to="/bills"
        className="inline-block text-sm text-ink-soft underline-offset-2 hover:text-ink hover:underline"
      >
        ← Bills
      </Link>

      <section className="rounded-2xl border border-edge bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-ink">{bill.name}</h1>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {billBadges(bill).map((label) => (
                <Badge key={label}>{label}</Badge>
              ))}
              {bill.closed && <Badge>Closed</Badge>}
            </div>
          </div>
          <div className="flex gap-2">
            {!bill.closed && (
              <>
                <EditButton type="button" onClick={() => setEditingBill(true)} />
                <SecondaryButton type="button" onClick={() => setClosingBill(true)}>
                  Close
                </SecondaryButton>
              </>
            )}
            <DeleteButton
              type="button"
              onClick={() => setDeletingBill(true)}
              className="!text-overdue hover:!bg-overdue-wash"
            />
          </div>
        </div>

        <dl className="mt-6 flex flex-wrap gap-x-10 gap-y-4 border-t border-edge pt-5">
          <div>
            <dt className="text-xs font-semibold tracking-wide text-ink-faint uppercase">
              Next payment
            </dt>
            <dd className="mt-1.5">
              <DueBadge dueDate={upcoming?.due_date ?? null} />
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold tracking-wide text-ink-faint uppercase">
              Amount due
            </dt>
            <dd className="mt-1">
              {upcoming?.amount !== undefined ? (
                <Money value={upcoming.amount} className="text-xl font-semibold" />
              ) : (
                <span className="text-sm text-ink-soft">{upcoming ? 'Not set yet' : '—'}</span>
              )}
            </dd>
          </div>
        </dl>
      </section>

      {rows.length === 0 ? (
        <EmptyState title="No payables">
          {bill.closed
            ? 'This bill was closed before any payment was recorded.'
            : 'Something went wrong generating this bill’s first payable.'}
        </EmptyState>
      ) : (
        <Table headers={HEADERS}>
          {rows.map((row) => (
            <tr key={row.id} className={row.paid ? 'bg-settled-wash/40' : undefined}>
              <td className="tnum px-4 py-3 font-mono text-sm">{row.due_date}</td>
              <td className="px-4 py-3">
                {row.amount !== undefined ? (
                  <Money value={row.amount} />
                ) : (
                  <span className="text-sm text-ink-faint">—</span>
                )}
              </td>
              <td className="px-4 py-3">{statusCell(row)}</td>
              <td className="px-4 py-3">{rowActions(row)}</td>
            </tr>
          ))}
        </Table>
      )}

      {editingBill && (
        <EditBillModal
          open
          bill={bill}
          onSubmit={(patch) => {
            setEditingBill(false)
            updateBill.mutate({ id: bill.id, patch })
          }}
          onClose={() => setEditingBill(false)}
        />
      )}

      <ConfirmDialog
        open={closingBill}
        title="Close bill"
        message={
          unpaidCount > 0
            ? `Close ${bill.name}? Its ${unpaidCount} upcoming unpaid ${
                unpaidCount === 1 ? 'payable' : 'payables'
              } will be removed. Paid history is kept. This cannot be undone.`
            : `Close ${bill.name}? Paid history is kept. This cannot be undone.`
        }
        confirmLabel="Close bill"
        onConfirm={() => {
          setClosingBill(false)
          closeBill.mutate(bill.id)
        }}
        onClose={() => setClosingBill(false)}
      />

      <ConfirmDialog
        open={deletingBill}
        title="Delete bill"
        message={`Delete ${bill.name} and its ${rows.length} ${
          rows.length === 1 ? 'payable' : 'payables'
        }?`}
        confirmLabel="Delete"
        onConfirm={() => {
          // Leaving first is safe: the bill is already gone from the cached list
          // this navigates to, and a failure restores it and raises a toast.
          setDeletingBill(false)
          void navigate('/bills')
          deleteBill.mutate(bill.id)
        }}
        onClose={() => setDeletingBill(false)}
      />

      {payRow?.amount !== undefined && (
        <PayModal
          open
          defaultAmount={payRow.amount}
          savingsBalance={balanceAsOf(data.savings_ledger)}
          onSubmit={submitPay}
          onClose={() => setPayRow(null)}
        />
      )}

      {editingRow && (
        <PayableFormModal
          open
          row={editingRow}
          title={editingRow.amount === undefined ? 'Set amount' : 'Edit payable'}
          onSubmit={(patch) => {
            const rowId = editingRow.id
            setEditingRow(null)
            updateBillPayable.mutate({ id: rowId, patch })
          }}
          onClose={() => setEditingRow(null)}
        />
      )}

      <ConfirmDialog
        open={deletingRow !== null}
        title="Delete payable"
        message={`Delete the ${deletingRow?.due_date ?? ''} payable?`}
        confirmLabel="Delete"
        onConfirm={() => {
          const rowId = deletingRow?.id
          setDeletingRow(null)
          if (rowId !== undefined) deleteBillPayable.mutate(rowId)
        }}
        onClose={() => setDeletingRow(null)}
      />
    </div>
  )
}
