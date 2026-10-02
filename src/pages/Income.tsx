import { useState } from 'react'
import { useFinanceData } from '../hooks/useFinanceData.ts'
import { useFinanceMutations } from '../hooks/useFinanceMutations.ts'
import { monthTotal, sourceName } from '../lib/income.ts'
import { monthKey, monthLabel, addMonths, inMonth } from '../lib/currentMonth.ts'
import { isTemp } from '../lib/tempId.ts'
import { Money } from '../components/Money.tsx'
import {
  BrutalButton,
  BrutalConfirm,
  BrutalEmptyState,
  BrutalPageHeader,
  BrutalSecondaryButton,
  BrutalStepper,
} from '../components/brutal.tsx'
import { BrutalFigure, BrutalRowActions, BrutalTable, cellClass } from '../components/brutalData.tsx'
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
  const label = monthLabel(month)

  return (
    <div className="space-y-10">
      <BrutalPageHeader
        title="Income"
        summary={
          <>
            <Money value={total} tone="inherit" className="font-bold" /> in {label}
          </>
        }
        action={
          <div className="flex flex-wrap items-center gap-3">
            <BrutalSecondaryButton type="button" onClick={() => setManaging(true)}>
              Manage sources
            </BrutalSecondaryButton>
            <BrutalButton type="button" onClick={() => setAdding(true)}>
              + Add income
            </BrutalButton>
          </div>
        }
      />

      <BrutalStepper
        label={label}
        unit="month"
        onPrev={() => setMonth(addMonths(month, -1))}
        onNext={() => setMonth(addMonths(month, 1))}
      />

      {rows.length === 0 ? (
        <BrutalEmptyState title={`Nothing logged for ${label}`}>
          Add a payday, or step back a month to see earlier entries.
        </BrutalEmptyState>
      ) : (
        <BrutalTable columns={['Date', 'Source', 'Amount', 'Notes']} actions>
          {rows.map((row) => {
            const pending = isTemp(row.id)
            return (
              <tr key={row.id}>
                <td className={`tnum ${cellClass} font-mono`}>{row.date}</td>
                <td className={`${cellClass} font-bold`}>{sourceName(data.income_sources, row.source_id)}</td>
                <td className={cellClass}>
                  <BrutalFigure value={row.amount} />
                </td>
                <td className={`${cellClass} font-mono text-xs text-neutral-500`}>{row.notes ?? ''}</td>
                <td className={cellClass}>
                  <BrutalRowActions pending={pending} onEdit={() => setEditing(row)} onDelete={() => setDeleting(row)} />
                </td>
              </tr>
            )
          })}
        </BrutalTable>
      )}

      {/* Mounted only while open, so each form resets without a manual reset(). */}
      {adding && (
        <AddIncomeModal sources={data.income_sources} onClose={() => setAdding(false)} />
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
          entry={editing}
          sources={data.income_sources}
          onClose={() => setEditing(null)}
          onMonthChange={setMonth}
        />
      )}
      <BrutalConfirm
        open={deleting !== null}
        title="Delete income"
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
