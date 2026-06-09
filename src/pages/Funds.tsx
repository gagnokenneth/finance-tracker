import { useState } from 'react'
import type { FormEvent } from 'react'
import { useFinanceData } from '../hooks/useFinanceData.ts'
import { useFinanceMutations } from '../hooks/useFinanceMutations.ts'
import { isoDate } from '../lib/currentMonth.ts'
import { Card } from '../components/Card.tsx'
import { Money } from '../components/Money.tsx'
import { Table } from '../components/Table.tsx'
import { Field, TextInput, Button } from '../components/ui.tsx'

export function Funds() {
  const { data, isLoading } = useFinanceData()
  const { addFund } = useFinanceMutations()
  const [source, setSource] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(isoDate())
  const [notes, setNotes] = useState('')

  if (isLoading || !data) return <p className="text-slate-500">Loading…</p>

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!source || !amount) return
    addFund.mutate(
      { source, amount: Number(amount), date, notes: notes || undefined },
      {
        onSuccess: () => {
          setSource('')
          setAmount('')
          setNotes('')
        },
      },
    )
  }

  return (
    <div className="space-y-6">
      <Card title="Add Income / Fund">
        <form onSubmit={submit} className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <Field label="Source">
            <TextInput value={source} onChange={(e) => setSource(e.target.value)} placeholder="Salary" />
          </Field>
          <Field label="Amount">
            <TextInput type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
          <Field label="Date">
            <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Notes">
            <TextInput value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
          <div className="sm:col-span-4">
            <Button type="submit" disabled={addFund.isPending}>
              Add Fund
            </Button>
          </div>
        </form>
      </Card>

      <Table headers={['Source', 'Amount', 'Date', 'Notes']}>
        {data.funds.map((f) => (
          <tr key={f.id}>
            <td className="px-3 py-2">{f.source}</td>
            <td className="px-3 py-2">
              <Money value={f.amount} />
            </td>
            <td className="px-3 py-2">{f.date}</td>
            <td className="px-3 py-2 text-slate-500">{f.notes ?? ''}</td>
          </tr>
        ))}
      </Table>
    </div>
  )
}
