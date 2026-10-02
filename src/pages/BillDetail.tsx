import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useFinanceData } from '../hooks/useFinanceData.ts'
import { useFinanceMutations } from '../hooks/useFinanceMutations.ts'
import { billBadges, payablesFor, recurrenceOf, upcomingPayable } from '../lib/bills.ts'
import { nextDueDate } from '../lib/billSchedule.ts'
import { isTemp } from '../lib/tempId.ts'
import { balanceAsOf, paymentsByRef, refKey } from '../lib/savings.ts'
import { Money } from '../components/Money.tsx'
import { DeleteIcon, EditIcon } from '../components/icons.tsx'
import { LoadError } from '../components/LoadError.tsx'
import { LoadingScreen } from '../components/LoadingScreen.tsx'
import {
  BrutalBackLink,
  BrutalConfirm,
  BrutalEmptyState,
  BrutalIconButton,
  BrutalNotFound,
  BrutalSecondaryButton,
} from '../components/brutal.tsx'
import {
  BrutalDetailHero,
  BrutalDueBadge,
  BrutalFigure,
  BrutalLedgerRowActions,
  BrutalRowStatus,
  BrutalStat,
  BrutalTable,
  BrutalTag,
  cellClass,
} from '../components/brutalData.tsx'
import { BrutalPayModal } from '../components/BrutalPayModal.tsx'
import type { PayResult } from '../hooks/usePayForm.ts'
import { EditBillModal } from './bills/EditBillModal.tsx'
import { PayableFormModal } from './bills/PayableFormModal.tsx'
import type { BillPayable } from '../types.ts'

const COLUMNS = ['Due date', 'Amount', 'Status']

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
  if (!bill) return <BrutalNotFound noun="bill" to="/bills" listLabel="bills" />

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

  return (
    <div className="space-y-8">
      <BrutalBackLink to="/bills">Bills</BrutalBackLink>

      <BrutalDetailHero
        title={bill.name}
        tags={
          <>
            {billBadges(bill).map((label) => (
              <BrutalTag key={label}>{label}</BrutalTag>
            ))}
            {bill.closed && <BrutalTag muted>Closed</BrutalTag>}
          </>
        }
        actions={
          <>
            {!bill.closed && (
              <>
                <BrutalIconButton label="Edit bill" onClick={() => setEditingBill(true)}>
                  <EditIcon />
                </BrutalIconButton>
                <BrutalSecondaryButton type="button" className="h-10" onClick={() => setClosingBill(true)}>
                  Close
                </BrutalSecondaryButton>
              </>
            )}
            <BrutalIconButton label="Delete bill" onClick={() => setDeletingBill(true)}>
              <DeleteIcon />
            </BrutalIconButton>
          </>
        }
      >
        <BrutalStat label="Amount due">
          {upcoming?.amount !== undefined ? (
            <Money value={upcoming.amount} className="text-4xl font-bold" />
          ) : (
            <span className="font-mono text-sm text-neutral-500">{upcoming ? 'Not set yet' : '—'}</span>
          )}
        </BrutalStat>
        <BrutalStat label="Next payment">
          <BrutalDueBadge dueDate={upcoming?.due_date ?? null} className="text-xl font-bold" />
        </BrutalStat>
      </BrutalDetailHero>

      {rows.length === 0 ? (
        <BrutalEmptyState title="No payables">
          {bill.closed
            ? 'This bill was closed before any payment was recorded.'
            : 'Something went wrong generating this bill’s first payable.'}
        </BrutalEmptyState>
      ) : (
        <BrutalTable columns={COLUMNS} actions>
          {rows.map((row) => (
            <tr key={row.id} className={row.paid ? 'bg-neutral-50' : undefined}>
              <td className={`tnum ${cellClass} font-mono`}>{row.due_date}</td>
              <td className={cellClass}>
                <BrutalFigure value={row.amount} />
              </td>
              <td className={cellClass}>
                <BrutalRowStatus row={row} fromSavings={fundedByRef.has(refKey('bill_payable', row.id))} />
              </td>
              <td className={cellClass}>
                {/* A closed bill is history: readable, and frozen. */}
                {!bill.closed && (
                  <BrutalLedgerRowActions
                    pending={isTemp(row.id)}
                    paid={row.paid}
                    priced={row.amount !== undefined}
                    onSetAmount={() => setEditingRow(row)}
                    onPay={() => setPayRow(row)}
                    onEdit={() => setEditingRow(row)}
                    onDelete={() => setDeletingRow(row)}
                  />
                )}
              </td>
            </tr>
          ))}
        </BrutalTable>
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

      <BrutalConfirm
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

      <BrutalConfirm
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
        <BrutalPayModal
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

      <BrutalConfirm
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
