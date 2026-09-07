import { useState } from 'react'
import { useFinanceData } from '../hooks/useFinanceData.ts'
import { useFinanceMutations } from '../hooks/useFinanceMutations.ts'
import { monthTotal, sourceName } from '../lib/income.ts'
import { monthKey, addMonths, inMonth } from '../lib/currentMonth.ts'
import { isTemp } from '../lib/tempId.ts'
import { Money } from '../components/Money.tsx'
import { Table } from '../components/Table.tsx'
import { Button, SecondaryButton, EditRowButton, DeleteRowButton } from '../components/ui.tsx'
import { ConfirmDialog } from '../components/ConfirmDialog.tsx'
import { PendingBadge } from '../components/PendingBadge.tsx'
import { EmptyState } from '../components/EmptyState.tsx'
import { LoadError } from '../components/LoadError.tsx'
import { LoadingScreen } from '../components/LoadingScreen.tsx'
import { AddIncomeModal } from './income/AddIncomeModal.tsx'
import { EditIncomeModal } from './income/EditIncomeModal.tsx'
import { ManageSourcesModal } from './income/ManageSourcesModal.tsx'
import type { IncomeEntry } from '../types.ts'

export function Income() {
  const { data, isPending, isError, error } = useFinanceData()
  const { deleteIncome } = useFinanceMutations()
  const [month, setMonth] = useState(monthKey())
  const [adding, setAdding] = useState(false)
  const [managing, setManaging] = useState(false)
  const [editing, setEditing] = useState<IncomeEntry | null>(null)
  const [deleting, setDeleting] = useState<IncomeEntry | null>(null)

  if (isPending) return <LoadingScreen />
  if (isError || !data) return <LoadError error={error} />

  const rows = inMonth(data.income, month)
  const total = monthTotal(rows)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Income</h1>
          <p className="mt-1 text-sm text-ink-soft">
            <Money value={total} className="font-semibold" /> in{' '}
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
          <SecondaryButton type="button" onClick={() => setManaging(true)}>
            Manage sources
          </SecondaryButton>
          <Button type="button" onClick={() => setAdding(true)}>
            Add income
          </Button>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState title={`Nothing logged for ${month}`}>
          Add a payday, or step back a month to see earlier entries.
        </EmptyState>
      ) : (
        <Table headers={['Date', 'Source', 'Amount', 'Notes', '']}>
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="px-4 py-3">{row.date}</td>
              <td className="px-4 py-3">
                {sourceName(data.income_sources, row.source_id)}
                {isTemp(row.id) && <PendingBadge />}
              </td>
              <td className="px-4 py-3">
                <Money value={row.amount} />
              </td>
              <td className="px-4 py-3 text-ink-faint">{row.notes ?? ''}</td>
              <td className="px-4 py-3 text-right">
                <span className="flex justify-end gap-2">
                  <EditRowButton onClick={() => setEditing(row)} disabled={isTemp(row.id)} />
                  <DeleteRowButton onClick={() => setDeleting(row)} disabled={isTemp(row.id)} />
                </span>
              </td>
            </tr>
          ))}
        </Table>
      )}

      {/* Mounted only while open, so each form resets without a manual reset(). */}
      {adding && (
        <AddIncomeModal open sources={data.income_sources} onClose={() => setAdding(false)} />
      )}
      {managing && (
        <ManageSourcesModal
          open
          sources={data.income_sources}
          entries={data.income}
          onClose={() => setManaging(false)}
        />
      )}
      {editing && (
        <EditIncomeModal
          open
          entry={editing}
          sources={data.income_sources}
          onClose={() => setEditing(null)}
          onMonthChange={setMonth}
        />
      )}
      <ConfirmDialog
        open={deleting !== null}
        title="Delete income?"
        message={
          deleting
            ? `${sourceName(data.income_sources, deleting.source_id)} on ${deleting.date}. This cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        onConfirm={() => {
          if (deleting) deleteIncome.mutate(deleting.id)
          setDeleting(null)
        }}
        onClose={() => setDeleting(null)}
      />
    </div>
  )
}
