import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useFinanceData } from '../hooks/useFinanceData.ts'
import { nextDueDate, totalBalance } from '../lib/debts.ts'
import { Money } from '../components/Money.tsx'
import { Table } from '../components/Table.tsx'
import { DueBadge } from '../components/DueBadge.tsx'
import { Button } from '../components/ui.tsx'
import { AddDebtModal } from './debts/AddDebtModal.tsx'

export function Debts() {
  const { data, isLoading, isError } = useFinanceData()
  const navigate = useNavigate()
  const [adding, setAdding] = useState(false)

  if (isLoading) return <p className="text-slate-500">Loading…</p>
  if (isError || !data) return <p className="text-red-600">Failed to load debts.</p>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Debts</h1>
        <Button type="button" onClick={() => setAdding(true)}>
          + Add Debt
        </Button>
      </div>

      {data.debts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-slate-500">No debts yet.</p>
        </div>
      ) : (
        <Table headers={['Name', 'Next Due', 'Total Balance']}>
          {data.debts.map((d) => (
            // Row click is a convenience; the name Link is the real target, so
            // keyboard and screen-reader users still get proper navigation.
            <tr
              key={d.id}
              onClick={() => void navigate(`/debts/${d.id}`)}
              className="cursor-pointer hover:bg-slate-50"
            >
              <td className="px-3 py-2">
                <Link to={`/debts/${d.id}`} className="font-medium text-slate-900 hover:underline">
                  {d.name}
                </Link>
              </td>
              <td className="px-3 py-2">
                <DueBadge dueDate={nextDueDate(d, data.debt_schedule, data.debt_statements)} />
              </td>
              <td className="px-3 py-2">
                <Money value={totalBalance(d, data.debt_schedule, data.debt_statements)} />
              </td>
            </tr>
          ))}
        </Table>
      )}

      <AddDebtModal open={adding} onClose={() => setAdding(false)} />
    </div>
  )
}
