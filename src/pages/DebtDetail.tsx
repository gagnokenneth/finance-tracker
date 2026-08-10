import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useFinanceData } from '../hooks/useFinanceData.ts'
import { useFinanceMutations } from '../hooks/useFinanceMutations.ts'
import { nextDueDate, scheduleFor, statementsFor, totalBalance, dueStatus } from '../lib/debts.ts'
import { Money } from '../components/Money.tsx'
import { Table } from '../components/Table.tsx'
import { DueBadge } from '../components/DueBadge.tsx'
import { StatusBadge } from '../components/StatusBadge.tsx'
import { InstallmentStrip } from '../components/InstallmentStrip.tsx'
import { ConfirmDialog } from '../components/ConfirmDialog.tsx'
import { LoadError } from '../components/LoadError.tsx'
import { LoadingScreen } from '../components/LoadingScreen.tsx'
import { Button, SecondaryButton, RowButton } from '../components/ui.tsx'
import { EditDebtModal } from './debts/EditDebtModal.tsx'
import { PayModal } from '../components/PayModal.tsx'
import type { PayResult } from '../components/PayModal.tsx'
import { RowFormModal } from './debts/RowFormModal.tsx'
import type { DebtScheduleRow, DebtStatement } from '../types.ts'
import type { NewScheduleRow, NewStatement } from '../api/FinanceApi.ts'

type AnyRow = DebtScheduleRow | DebtStatement
type RowForm = { mode: 'add' } | { mode: 'edit'; row: AnyRow }

const FIXED_HEADERS = ['Due date', 'Amount', 'Status', '']
const REVOLVING_HEADERS = ['Due date', 'Min due', 'Total due', 'Outstanding', 'Status', '']

export function DebtDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data, isPending, isError, error } = useFinanceData()
  const {
    updateDebt,
    deleteDebt,
    addScheduleRow,
    updateScheduleRow,
    deleteScheduleRow,
    addStatement,
    updateStatement,
    deleteStatement,
  } = useFinanceMutations()

  const [editingDebt, setEditingDebt] = useState(false)
  const [deletingDebt, setDeletingDebt] = useState(false)
  const [payRow, setPayRow] = useState<AnyRow | null>(null)
  const [rowForm, setRowForm] = useState<RowForm | null>(null)
  const [deletingRow, setDeletingRow] = useState<AnyRow | null>(null)

  if (isPending) return <LoadingScreen />
  if (isError || !data) return <LoadError error={error} />

  const debtId = Number(id)
  const debt = data.debts.find((d) => d.id === debtId)
  if (!debt) {
    return (
      <p className="text-ink-soft">
        That debt no longer exists.{' '}
        <Link to="/debts" className="font-medium text-brand underline underline-offset-2">
          Back to debts
        </Link>
      </p>
    )
  }

  const isFixed = debt.type === 'fixed'
  const rows: AnyRow[] = isFixed
    ? scheduleFor(data.debt_schedule, debt.id)
    : statementsFor(data.debt_statements, debt.id)
  const paidCount = rows.filter((r) => r.paid).length

  const balance = totalBalance(debt, data.debt_schedule, data.debt_statements)
  const next = nextDueDate(debt, data.debt_schedule, data.debt_statements)

  // Only the adds keep a dialog open long enough to have a state worth showing;
  // see the policy note in lib/optimistic.ts.
  const addPending = addScheduleRow.isPending || addStatement.isPending
  const addError = addScheduleRow.isError || addStatement.isError

  const closeRowForm = () => setRowForm(null)

  // Mutation error state outlives the dialog, so without this a form opened
  // after a failed add would greet you with the previous failure.
  const openAddRow = () => {
    addScheduleRow.reset()
    addStatement.reset()
    setRowForm({ mode: 'add' })
  }

  // `'amount' in values` is a real narrowing: only schedule rows carry it.
  const submitRowForm = (values: NewScheduleRow | NewStatement) => {
    const editingId = rowForm?.mode === 'edit' ? rowForm.row.id : null
    if (editingId !== null) {
      closeRowForm()
      if ('amount' in values) updateScheduleRow.mutate({ id: editingId, patch: values })
      else updateStatement.mutate({ id: editingId, patch: values })
    } else if ('amount' in values) {
      addScheduleRow.mutate({ debtId: debt.id, input: values }, { onSuccess: closeRowForm })
    } else {
      addStatement.mutate({ debtId: debt.id, input: values }, { onSuccess: closeRowForm })
    }
  }

  const submitPay = (result: PayResult) => {
    if (!payRow) return
    setPayRow(null)
    if ('amount' in payRow) {
      updateScheduleRow.mutate({ id: payRow.id, patch: result })
    } else {
      updateStatement.mutate({ id: payRow.id, patch: result })
    }
  }

  const confirmDeleteRow = () => {
    if (!deletingRow) return
    setDeletingRow(null)
    if ('amount' in deletingRow) {
      deleteScheduleRow.mutate(deletingRow.id)
    } else {
      deleteStatement.mutate(deletingRow.id)
    }
  }

  const statusCell = (row: AnyRow) =>
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
      </span>
    ) : (
      <StatusBadge status={dueStatus(row.due_date)} />
    )

  const rowNoun = isFixed ? 'scheduled payments' : 'statements'

  return (
    <div className="space-y-6">
      <Link
        to="/debts"
        className="inline-block text-sm text-ink-soft underline-offset-2 hover:text-ink hover:underline"
      >
        ← Debts
      </Link>

      {/* Hero: the payoff strip leads, because "how close am I to done" is the
          question this page exists to answer. */}
      <section className="rounded-2xl border border-edge bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-ink">{debt.name}</h1>
            <p className="mt-1 text-xs font-semibold tracking-wide text-ink-faint uppercase">
              {isFixed ? 'Fixed term' : 'Revolving'}
            </p>
          </div>
          <div className="flex gap-2">
            <SecondaryButton type="button" onClick={() => setEditingDebt(true)}>
              Rename
            </SecondaryButton>
            <SecondaryButton
              type="button"
              onClick={() => setDeletingDebt(true)}
              className="!text-overdue hover:!bg-overdue-wash"
            >
              Delete
            </SecondaryButton>
          </div>
        </div>

        <div className="mt-6">
          {isFixed ? (
            <InstallmentStrip kind="fixed" paid={paidCount} total={rows.length} />
          ) : (
            <InstallmentStrip kind="revolving" paid={paidCount} />
          )}
        </div>

        <dl className="mt-6 flex flex-wrap gap-x-10 gap-y-4 border-t border-edge pt-5">
          <div>
            <dt className="text-xs font-semibold tracking-wide text-ink-faint uppercase">
              Balance left
            </dt>
            <dd className="mt-1">
              <Money value={balance} className="text-xl font-semibold" />
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold tracking-wide text-ink-faint uppercase">
              Next payment
            </dt>
            <dd className="mt-1.5">
              <DueBadge dueDate={next} />
            </dd>
          </div>
        </dl>
      </section>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-edge bg-white p-12 text-center">
          <p className="font-medium text-ink">No {rowNoun} yet</p>
          <p className="mt-1 text-sm text-ink-soft">
            {isFixed
              ? 'Add the payments you owe on this loan.'
              : 'Add a statement when it arrives.'}
          </p>
        </div>
      ) : (
        <Table headers={isFixed ? FIXED_HEADERS : REVOLVING_HEADERS}>
          {rows.map((row) => (
            <tr key={row.id} className={row.paid ? 'bg-settled-wash/40' : undefined}>
              <td className="tnum px-4 py-3 font-mono text-sm">{row.due_date}</td>
              {'amount' in row ? (
                <td className="px-4 py-3">
                  <Money value={row.amount} />
                </td>
              ) : (
                <>
                  <td className="px-4 py-3">
                    <Money value={row.min_due} />
                  </td>
                  <td className="px-4 py-3">
                    <Money value={row.total_due} />
                  </td>
                  <td className="px-4 py-3">
                    <Money value={row.outstanding} />
                  </td>
                </>
              )}
              <td className="px-4 py-3">{statusCell(row)}</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap justify-end gap-1.5">
                  {!row.paid && (
                    <RowButton tone="primary" type="button" onClick={() => setPayRow(row)}>
                      Pay
                    </RowButton>
                  )}
                  <RowButton type="button" onClick={() => setRowForm({ mode: 'edit', row })}>
                    Edit
                  </RowButton>
                  <RowButton tone="danger" type="button" onClick={() => setDeletingRow(row)}>
                    Delete
                  </RowButton>
                </div>
              </td>
            </tr>
          ))}
        </Table>
      )}

      <Button type="button" onClick={openAddRow}>
        {isFixed ? 'Add payment' : 'Add statement'}
      </Button>

      {editingDebt && (
        <EditDebtModal
          open
          currentName={debt.name}
          onSubmit={(name) => {
            setEditingDebt(false)
            updateDebt.mutate({ id: debt.id, name })
          }}
          onClose={() => setEditingDebt(false)}
        />
      )}

      <ConfirmDialog
        open={deletingDebt}
        title="Delete debt"
        message={`Delete ${debt.name} and its ${rows.length} ${rowNoun}?`}
        confirmLabel="Delete"
        onConfirm={() => {
          // Leaving first is safe: the debt is already gone from the cached list
          // this navigates to, and a failure restores it and raises a toast.
          setDeletingDebt(false)
          void navigate('/debts')
          deleteDebt.mutate(debt.id)
        }}
        onClose={() => setDeletingDebt(false)}
      />

      {payRow && (
        <PayModal
          open
          defaultAmount={'amount' in payRow ? payRow.amount : payRow.min_due}
          onSubmit={submitPay}
          onClose={() => setPayRow(null)}
        />
      )}

      {rowForm && (
        <RowFormModal
          open
          kind={isFixed ? 'schedule' : 'statement'}
          initial={rowForm.mode === 'edit' ? rowForm.row : null}
          pending={rowForm.mode === 'add' && addPending}
          error={rowForm.mode === 'add' && addError}
          onSubmit={submitRowForm}
          onClose={closeRowForm}
        />
      )}

      <ConfirmDialog
        open={deletingRow !== null}
        title={isFixed ? 'Delete payment' : 'Delete statement'}
        message={`Delete the ${deletingRow?.due_date ?? ''} ${isFixed ? 'payment' : 'statement'}?`}
        confirmLabel="Delete"
        onConfirm={confirmDeleteRow}
        onClose={() => setDeletingRow(null)}
      />
    </div>
  )
}
