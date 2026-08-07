import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useFinanceData } from '../hooks/useFinanceData.ts'
import { useFinanceMutations } from '../hooks/useFinanceMutations.ts'
import {
  nextDueDate,
  scheduleFor,
  statementsFor,
  totalBalance,
  dueStatus,
  DUE_STATUS_LABEL,
} from '../lib/debts.ts'
import { Money } from '../components/Money.tsx'
import { Table } from '../components/Table.tsx'
import { DueBadge } from '../components/DueBadge.tsx'
import { ConfirmDialog } from '../components/ConfirmDialog.tsx'
import { Button } from '../components/ui.tsx'
import { EditDebtModal } from './debts/EditDebtModal.tsx'
import { PayModal } from './debts/PayModal.tsx'
import type { PayResult } from './debts/PayModal.tsx'
import { RowFormModal } from './debts/RowFormModal.tsx'
import type { DebtScheduleRow, DebtStatement } from '../types.ts'
import type { NewScheduleRow, NewStatement } from '../api/FinanceApi.ts'

type AnyRow = DebtScheduleRow | DebtStatement
type RowForm = { mode: 'add' } | { mode: 'edit'; row: AnyRow }

const FIXED_HEADERS = ['Due Date', 'Amount', 'Status', '']
const REVOLVING_HEADERS = ['Due Date', 'Min Due', 'Total Due', 'Outstanding', 'Status', '']

export function DebtDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data, isLoading, isError } = useFinanceData()
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

  if (isLoading) return <p className="text-slate-500">Loading…</p>
  if (isError || !data) return <p className="text-red-600">Failed to load debts.</p>

  const debtId = Number(id)
  const debt = data.debts.find((d) => d.id === debtId)
  if (!debt) {
    return (
      <p className="text-slate-500">
        Debt not found.{' '}
        <Link to="/debts" className="text-slate-900 underline">
          Back to debts
        </Link>
      </p>
    )
  }

  const isFixed = debt.type === 'fixed'
  const rows: AnyRow[] = isFixed
    ? scheduleFor(data.debt_schedule, debt.id)
    : statementsFor(data.debt_statements, debt.id)

  const balance = totalBalance(debt, data.debt_schedule, data.debt_statements)
  const next = nextDueDate(debt, data.debt_schedule, data.debt_statements)

  const rowPending =
    addScheduleRow.isPending ||
    updateScheduleRow.isPending ||
    addStatement.isPending ||
    updateStatement.isPending
  const rowError =
    addScheduleRow.isError ||
    updateScheduleRow.isError ||
    addStatement.isError ||
    updateStatement.isError
  const deleteRowPending = deleteScheduleRow.isPending || deleteStatement.isPending
  const deleteRowError = deleteScheduleRow.isError || deleteStatement.isError

  const closeRowForm = () => setRowForm(null)

  // `'amount' in values` is a real narrowing: only schedule rows carry it.
  const submitRowForm = (values: NewScheduleRow | NewStatement) => {
    const editingId = rowForm?.mode === 'edit' ? rowForm.row.id : null
    if ('amount' in values) {
      if (editingId !== null) {
        updateScheduleRow.mutate({ id: editingId, patch: values }, { onSuccess: closeRowForm })
      } else {
        addScheduleRow.mutate({ debtId: debt.id, input: values }, { onSuccess: closeRowForm })
      }
    } else {
      if (editingId !== null) {
        updateStatement.mutate({ id: editingId, patch: values }, { onSuccess: closeRowForm })
      } else {
        addStatement.mutate({ debtId: debt.id, input: values }, { onSuccess: closeRowForm })
      }
    }
  }

  const submitPay = (result: PayResult) => {
    if (!payRow) return
    const done = { onSuccess: () => setPayRow(null) }
    if ('amount' in payRow) {
      updateScheduleRow.mutate({ id: payRow.id, patch: result }, done)
    } else {
      updateStatement.mutate({ id: payRow.id, patch: result }, done)
    }
  }

  const confirmDeleteRow = () => {
    if (!deletingRow) return
    const done = { onSuccess: () => setDeletingRow(null) }
    if ('amount' in deletingRow) {
      deleteScheduleRow.mutate(deletingRow.id, done)
    } else {
      deleteStatement.mutate(deletingRow.id, done)
    }
  }

  const statusCell = (row: AnyRow) =>
    row.paid ? (
      <span className="text-slate-600">
        Paid {row.paid_date}
        {row.paid_amount !== undefined && (
          <>
            {' — '}
            <Money value={row.paid_amount} />
          </>
        )}
      </span>
    ) : (
      DUE_STATUS_LABEL[dueStatus(row.due_date)]
    )

  const actionCell = (row: AnyRow) => (
    <div className="flex flex-wrap gap-2">
      {!row.paid && (
        <button
          type="button"
          onClick={() => setPayRow(row)}
          className="rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white hover:bg-slate-700"
        >
          Pay
        </button>
      )}
      <button
        type="button"
        onClick={() => setRowForm({ mode: 'edit', row })}
        className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
      >
        Edit
      </button>
      <button
        type="button"
        onClick={() => setDeletingRow(row)}
        className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
      >
        Delete
      </button>
    </div>
  )

  const rowNoun = isFixed ? 'schedule rows' : 'statements'

  return (
    <div className="space-y-6">
      <Link to="/debts" className="text-sm text-slate-500 hover:underline">
        ← Debts
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-slate-900">{debt.name}</h1>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
            {debt.type}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setEditingDebt(true)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => setDeletingDebt(true)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      </div>

      <p className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
        <span>
          Total balance <Money value={balance} className="font-semibold" />
        </span>
        <span className="text-slate-300">·</span>
        <span className="flex items-center gap-2">
          Next due <DueBadge dueDate={next} />
        </span>
      </p>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-slate-500">No {rowNoun} yet.</p>
        </div>
      ) : (
        <Table headers={isFixed ? FIXED_HEADERS : REVOLVING_HEADERS}>
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="px-3 py-2 tabular-nums">{row.due_date}</td>
              {'amount' in row ? (
                <td className="px-3 py-2">
                  <Money value={row.amount} />
                </td>
              ) : (
                <>
                  <td className="px-3 py-2">
                    <Money value={row.min_due} />
                  </td>
                  <td className="px-3 py-2">
                    <Money value={row.total_due} />
                  </td>
                  <td className="px-3 py-2">
                    <Money value={row.outstanding} />
                  </td>
                </>
              )}
              <td className="px-3 py-2">{statusCell(row)}</td>
              <td className="px-3 py-2">{actionCell(row)}</td>
            </tr>
          ))}
        </Table>
      )}

      {(rowError || deleteRowError) && (
        <p className="text-sm text-red-600">Something went wrong. Please try again.</p>
      )}

      <Button type="button" onClick={() => setRowForm({ mode: 'add' })}>
        {isFixed ? '+ Add row' : '+ Add statement'}
      </Button>

      {editingDebt && (
        <EditDebtModal
          open
          currentName={debt.name}
          pending={updateDebt.isPending}
          error={updateDebt.isError}
          onSubmit={(name) =>
            updateDebt.mutate({ id: debt.id, name }, { onSuccess: () => setEditingDebt(false) })
          }
          onClose={() => setEditingDebt(false)}
        />
      )}

      <ConfirmDialog
        open={deletingDebt}
        title="Delete Debt"
        message={`Delete ${debt.name} and its ${rows.length} ${rowNoun}?`}
        confirmLabel="Delete"
        pending={deleteDebt.isPending}
        error={deleteDebt.isError}
        onConfirm={() =>
          deleteDebt.mutate(debt.id, { onSuccess: () => void navigate('/debts') })
        }
        onClose={() => setDeletingDebt(false)}
      />

      {payRow && (
        <PayModal
          open
          defaultAmount={'amount' in payRow ? payRow.amount : payRow.min_due}
          pending={rowPending}
          error={rowError}
          onSubmit={submitPay}
          onClose={() => setPayRow(null)}
        />
      )}

      {rowForm && (
        <RowFormModal
          open
          kind={isFixed ? 'schedule' : 'statement'}
          initial={rowForm.mode === 'edit' ? rowForm.row : null}
          pending={rowPending}
          error={rowError}
          onSubmit={submitRowForm}
          onClose={closeRowForm}
        />
      )}

      <ConfirmDialog
        open={deletingRow !== null}
        title={isFixed ? 'Delete Row' : 'Delete Statement'}
        message={`Delete the ${deletingRow?.due_date ?? ''} ${isFixed ? 'installment' : 'statement'}?`}
        confirmLabel="Delete"
        pending={deleteRowPending}
        error={deleteRowError}
        onConfirm={confirmDeleteRow}
        onClose={() => setDeletingRow(null)}
      />
    </div>
  )
}
