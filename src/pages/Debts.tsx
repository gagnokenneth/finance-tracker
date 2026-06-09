import { useState } from 'react'
import type { FormEvent } from 'react'
import type { DebtType } from '../types.ts'
import { useFinanceData } from '../hooks/useFinanceData.ts'
import { useFinanceMutations } from '../hooks/useFinanceMutations.ts'
import { isoDate } from '../lib/currentMonth.ts'
import { Card } from '../components/Card.tsx'
import { Money } from '../components/Money.tsx'
import { Table } from '../components/Table.tsx'
import { Field, TextInput, SelectInput, Button } from '../components/ui.tsx'

export function Debts() {
  const { data, isLoading } = useFinanceData()
  const { addDebt, payDebt } = useFinanceMutations()

  // add-debt form
  const [name, setName] = useState('')
  const [total, setTotal] = useState('')
  const [type, setType] = useState<DebtType>('straight')
  const [rate, setRate] = useState('0')
  const [debtNotes, setDebtNotes] = useState('')

  // payment form
  const [debtId, setDebtId] = useState('')
  const [payAmount, setPayAmount] = useState('')
  const [payDate, setPayDate] = useState(isoDate())
  const [payNotes, setPayNotes] = useState('')

  if (isLoading || !data) return <p className="text-slate-500">Loading…</p>

  const submitDebt = (e: FormEvent) => {
    e.preventDefault()
    if (!name || !total) return
    const totalNum = Number(total)
    addDebt.mutate(
      {
        name,
        total_amount: totalNum,
        remaining: totalNum,
        type,
        interest_rate: Number(rate),
        notes: debtNotes || undefined,
      },
      {
        onSuccess: () => {
          setName('')
          setTotal('')
          setRate('0')
          setDebtNotes('')
        },
      },
    )
  }

  const submitPayment = (e: FormEvent) => {
    e.preventDefault()
    if (!debtId || !payAmount) return
    payDebt.mutate(
      {
        debt_id: Number(debtId),
        amount_paid: Number(payAmount),
        date: payDate,
        notes: payNotes || undefined,
      },
      {
        onSuccess: () => {
          setPayAmount('')
          setPayNotes('')
        },
      },
    )
  }

  const debtName = (id: number) => data.debts.find((d) => d.id === id)?.name ?? `#${id}`

  return (
    <div className="space-y-6">
      <Card title="Add Debt">
        <form onSubmit={submitDebt} className="grid grid-cols-1 gap-3 sm:grid-cols-5">
          <Field label="Name">
            <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Credit Card" />
          </Field>
          <Field label="Total amount">
            <TextInput type="number" step="0.01" value={total} onChange={(e) => setTotal(e.target.value)} />
          </Field>
          <Field label="Type">
            <SelectInput value={type} onChange={(e) => setType(e.target.value as DebtType)}>
              <option value="straight">straight</option>
              <option value="installment">installment</option>
            </SelectInput>
          </Field>
          <Field label="Interest rate %">
            <TextInput type="number" step="0.01" value={rate} onChange={(e) => setRate(e.target.value)} />
          </Field>
          <Field label="Notes">
            <TextInput value={debtNotes} onChange={(e) => setDebtNotes(e.target.value)} />
          </Field>
          <div className="sm:col-span-5">
            <Button type="submit" disabled={addDebt.isPending}>
              Add Debt
            </Button>
          </div>
        </form>
      </Card>

      <Card title="Record Payment">
        <form onSubmit={submitPayment} className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <Field label="Debt">
            <SelectInput value={debtId} onChange={(e) => setDebtId(e.target.value)}>
              <option value="">Select…</option>
              {data.debts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Amount">
            <TextInput type="number" step="0.01" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
          </Field>
          <Field label="Date">
            <TextInput type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
          </Field>
          <Field label="Notes">
            <TextInput value={payNotes} onChange={(e) => setPayNotes(e.target.value)} />
          </Field>
          <div className="sm:col-span-4">
            <Button type="submit" disabled={payDebt.isPending}>
              Record Payment
            </Button>
          </div>
        </form>
      </Card>

      <Table headers={['Name', 'Type', 'Total', 'Remaining', 'Interest %', 'Notes']}>
        {data.debts.map((d) => (
          <tr key={d.id}>
            <td className="px-3 py-2">{d.name}</td>
            <td className="px-3 py-2">{d.type}</td>
            <td className="px-3 py-2">
              <Money value={d.total_amount} />
            </td>
            <td className="px-3 py-2">
              <Money value={d.remaining} />
            </td>
            <td className="px-3 py-2">{d.interest_rate}</td>
            <td className="px-3 py-2 text-slate-500">{d.notes ?? ''}</td>
          </tr>
        ))}
      </Table>

      <div>
        <h2 className="mb-2 text-sm font-medium text-slate-500">Payment History</h2>
        <Table headers={['Date', 'Debt', 'Amount', 'Notes']}>
          {data.debt_payments.map((p) => (
            <tr key={p.id}>
              <td className="px-3 py-2">{p.date}</td>
              <td className="px-3 py-2">{debtName(p.debt_id)}</td>
              <td className="px-3 py-2">
                <Money value={p.amount_paid} />
              </td>
              <td className="px-3 py-2 text-slate-500">{p.notes ?? ''}</td>
            </tr>
          ))}
        </Table>
      </div>
    </div>
  )
}
