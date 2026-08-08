import { useState } from 'react'
import type { FormEvent } from 'react'
import type { SavingsSource } from '../types.ts'
import { useFinanceData } from '../hooks/useFinanceData.ts'
import { useFinanceMutations } from '../hooks/useFinanceMutations.ts'
import { computeSummary } from '../lib/summary.ts'
import { monthKey, isoDate } from '../lib/currentMonth.ts'
import { Card } from '../components/Card.tsx'
import { Money } from '../components/Money.tsx'
import { Table } from '../components/Table.tsx'
import { Field, TextInput, SelectInput, Button } from '../components/ui.tsx'
import { LoadError } from '../components/LoadError.tsx'
import { LoadingScreen } from '../components/LoadingScreen.tsx'

export function Savings() {
  const { data, isLoading, isError, error } = useFinanceData()
  const { addSavings, transferSavings } = useFinanceMutations()

  // add-savings form
  const [amount, setAmount] = useState('')
  const [source, setSource] = useState<SavingsSource>('funds')
  const [date, setDate] = useState(isoDate())
  const [notes, setNotes] = useState('')

  // transfer form
  const [xferAmount, setXferAmount] = useState('')
  const [xferDate, setXferDate] = useState(isoDate())
  const [xferNotes, setXferNotes] = useState('')

  if (isLoading) return <LoadingScreen />
  if (isError || !data) return <LoadError error={error} />

  const s = computeSummary(data, monthKey())

  const submitSavings = (e: FormEvent) => {
    e.preventDefault()
    if (!amount) return
    addSavings.mutate(
      { amount: Number(amount), source, date, notes: notes || undefined },
      {
        onSuccess: () => {
          setAmount('')
          setNotes('')
        },
      },
    )
  }

  const submitTransfer = (e: FormEvent) => {
    e.preventDefault()
    if (!xferAmount) return
    transferSavings.mutate(
      { amount: Number(xferAmount), date: xferDate, notes: xferNotes || undefined },
      {
        onSuccess: () => {
          setXferAmount('')
          setXferNotes('')
        },
      },
    )
  }

  return (
    <div className="space-y-6">
      <Card title="Savings Total">
        <Money value={s.savingsTotal} className="text-2xl font-bold" />
      </Card>

      <Card title="Add to Savings">
        <form onSubmit={submitSavings} className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <Field label="Amount">
            <TextInput type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
          <Field label="Source">
            <SelectInput value={source} onChange={(e) => setSource(e.target.value as SavingsSource)}>
              <option value="funds">Funds</option>
              <option value="remaining_expendable">Remaining Expendable</option>
            </SelectInput>
          </Field>
          <Field label="Date">
            <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Notes">
            <TextInput value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
          <div className="sm:col-span-4">
            <Button type="submit" disabled={addSavings.isPending}>
              Add Savings
            </Button>
          </div>
        </form>
      </Card>

      <Table headers={['Date', 'Amount', 'Source', 'Total', 'Notes']}>
        {data.savings.map((row) => (
          <tr key={row.id}>
            <td className="px-3 py-2">{row.date}</td>
            <td className="px-3 py-2">
              <Money value={row.amount} />
            </td>
            <td className="px-3 py-2">{row.source}</td>
            <td className="px-3 py-2">
              <Money value={row.total} />
            </td>
            <td className="px-3 py-2 text-slate-500">{row.notes ?? ''}</td>
          </tr>
        ))}
      </Table>

      <Card title="Transfer to Funds">
        <form onSubmit={submitTransfer} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Amount">
            <TextInput type="number" step="0.01" value={xferAmount} onChange={(e) => setXferAmount(e.target.value)} />
          </Field>
          <Field label="Date">
            <TextInput type="date" value={xferDate} onChange={(e) => setXferDate(e.target.value)} />
          </Field>
          <Field label="Notes">
            <TextInput value={xferNotes} onChange={(e) => setXferNotes(e.target.value)} />
          </Field>
          <div className="sm:col-span-3">
            <Button type="submit" disabled={transferSavings.isPending}>
              Transfer to Funds
            </Button>
          </div>
        </form>
      </Card>

      <div>
        <h2 className="mb-2 text-sm font-medium text-slate-500">Transfers Out</h2>
        <Table headers={['Date', 'Amount', 'Notes']}>
          {data.savings_transfers.map((t) => (
            <tr key={t.id}>
              <td className="px-3 py-2">{t.date}</td>
              <td className="px-3 py-2">
                <Money value={t.amount} />
              </td>
              <td className="px-3 py-2 text-slate-500">{t.notes ?? ''}</td>
            </tr>
          ))}
        </Table>
      </div>
    </div>
  )
}
