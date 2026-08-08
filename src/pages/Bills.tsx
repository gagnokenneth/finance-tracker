import { useState } from 'react'
import type { FormEvent } from 'react'
import { useFinanceData } from '../hooks/useFinanceData.ts'
import { useFinanceMutations } from '../hooks/useFinanceMutations.ts'
import { isoDate } from '../lib/currentMonth.ts'
import { Card } from '../components/Card.tsx'
import { Money } from '../components/Money.tsx'
import { Table } from '../components/Table.tsx'
import { Field, TextInput, Button } from '../components/ui.tsx'
import { LoadError } from '../components/LoadError.tsx'
import { LoadingScreen } from '../components/LoadingScreen.tsx'

export function Bills() {
  const { data, isPending, isError, error } = useFinanceData()
  const { addBill, setBillPaid } = useFinanceMutations()
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [dueDate, setDueDate] = useState(isoDate())
  const [notes, setNotes] = useState('')

  if (isPending) return <LoadingScreen />
  if (isError || !data) return <LoadError error={error} />

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!name || !amount) return
    addBill.mutate(
      { name, amount: Number(amount), due_date: dueDate, paid: false, notes: notes || undefined },
      {
        onSuccess: () => {
          setName('')
          setAmount('')
          setNotes('')
        },
      },
    )
  }

  return (
    <div className="space-y-6">
      <Card title="Add Bill">
        <form onSubmit={submit} className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <Field label="Name">
            <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Rent" />
          </Field>
          <Field label="Amount">
            <TextInput type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
          <Field label="Due date">
            <TextInput type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </Field>
          <Field label="Notes">
            <TextInput value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
          <div className="sm:col-span-4">
            <Button type="submit" disabled={addBill.isPending}>
              Add Bill
            </Button>
          </div>
        </form>
      </Card>

      <Table headers={['Paid', 'Name', 'Amount', 'Due date', 'Notes']}>
        {data.bills.map((b) => (
          <tr key={b.id}>
            <td className="px-3 py-2">
              <input
                type="checkbox"
                checked={b.paid}
                disabled={setBillPaid.isPending}
                onChange={(e) => setBillPaid.mutate({ id: b.id, paid: e.target.checked })}
                className="h-4 w-4"
              />
            </td>
            <td className="px-3 py-2">{b.name}</td>
            <td className="px-3 py-2">
              <Money value={b.amount} />
            </td>
            <td className="px-3 py-2">{b.due_date}</td>
            <td className="px-3 py-2 text-slate-500">{b.notes ?? ''}</td>
          </tr>
        ))}
      </Table>
    </div>
  )
}
