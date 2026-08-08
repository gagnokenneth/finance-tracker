import { useState } from 'react'
import type { FormEvent } from 'react'
import { useFinanceData } from '../hooks/useFinanceData.ts'
import { useFinanceMutations } from '../hooks/useFinanceMutations.ts'
import { computeSummary } from '../lib/summary.ts'
import { monthKey, isoDate } from '../lib/currentMonth.ts'
import { Card } from '../components/Card.tsx'
import { Money } from '../components/Money.tsx'
import { Table } from '../components/Table.tsx'
import { Field, TextInput, Button } from '../components/ui.tsx'
import { LoadError } from '../components/LoadError.tsx'
import { LoadingScreen } from '../components/LoadingScreen.tsx'

function BudgetEditor({ month, current }: { month: string; current: number }) {
  const { setMonthlyBudget } = useFinanceMutations()
  const [value, setValue] = useState(String(current))
  const submit = (e: FormEvent) => {
    e.preventDefault()
    setMonthlyBudget.mutate({ month, amount: Number(value) })
  }
  return (
    <form onSubmit={submit} className="flex items-end gap-2">
      <Field label={`Monthly budget (${month})`}>
        <TextInput type="number" step="0.01" value={value} onChange={(e) => setValue(e.target.value)} />
      </Field>
      <Button type="submit" disabled={setMonthlyBudget.isPending}>
        Save
      </Button>
    </form>
  )
}

export function Expendable() {
  const { data, isPending, isError, error } = useFinanceData()
  const { addExpendable } = useFinanceMutations()
  const month = monthKey()
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(isoDate())
  const [notes, setNotes] = useState('')

  if (isPending) return <LoadingScreen />
  if (isError || !data) return <LoadError error={error} />

  const s = computeSummary(data, month)
  const entries = data.expendable.filter((e) => e.month === month)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!amount) return
    addExpendable.mutate(
      { month: monthKey(new Date(date)), daily_amount: Number(amount), date, notes: notes || undefined },
      {
        onSuccess: () => {
          setAmount('')
          setNotes('')
        },
      },
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card title="Monthly Expendable">
          <Money value={s.monthlyExpendable} className="text-xl font-semibold" />
        </Card>
        <Card title="Spent This Month">
          <Money value={s.spentThisMonth} className="text-xl font-semibold" />
        </Card>
        <Card title="Remaining Expendable">
          <Money value={s.remainingExpendable} className="text-xl font-semibold" />
        </Card>
      </div>

      <Card title="Set Budget">
        <BudgetEditor month={month} current={s.monthlyExpendable} />
      </Card>

      <Card title="Log Daily Spending">
        <form onSubmit={submit} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Amount">
            <TextInput type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
          <Field label="Date">
            <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Notes">
            <TextInput value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
          <div className="sm:col-span-3">
            <Button type="submit" disabled={addExpendable.isPending}>
              Log Spending
            </Button>
          </div>
        </form>
      </Card>

      <Table headers={['Date', 'Amount', 'Notes']}>
        {entries.map((e) => (
          <tr key={e.id}>
            <td className="px-3 py-2">{e.date}</td>
            <td className="px-3 py-2">
              <Money value={e.daily_amount} />
            </td>
            <td className="px-3 py-2 text-slate-500">{e.notes ?? ''}</td>
          </tr>
        ))}
      </Table>
    </div>
  )
}
