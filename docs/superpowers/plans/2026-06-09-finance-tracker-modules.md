# Finance Tracker — Module Screens Implementation Plan (Plan 2 of 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **No automated tests:** Per project preference, this plan creates NO test files. Verify each task with `npx tsc -b` (and `npm run build` on the final task).

**Goal:** Replace the five placeholder routes with full module screens (Funds, Bills, Expendable, Debts, Savings) — each a list view plus add/edit forms and the cross-module actions from the spec — all running against the existing `MockApi`.

**Architecture:** Reads come from the existing `useFinanceData()` query; writes go through a new `useFinanceMutations()` hook that wraps `FinanceApi` methods and invalidates the `finance` query so the dashboard and every screen stay in sync. Shared, Tailwind-styled form/table primitives keep the pages DRY. Routing and the summary engine already exist from Plan 1.

**Tech Stack:** React 19, TypeScript 6 (`verbatimModuleSyntax` → `import type`; imports include `.ts`/`.tsx` extensions), Vite 8, Tailwind v4, `@tanstack/react-query`, `react-router-dom`.

Reference spec: `docs/superpowers/specs/2026-06-09-personal-finance-tracker-design.md`
Builds on: `docs/superpowers/plans/2026-06-09-finance-tracker-foundation.md` (already merged)

---

## Existing code this plan depends on (already present)

- `src/hooks/useFinanceData.ts` exports `useFinanceData()` and `financeKey`.
- `src/api/index.ts` exports `getApi()`.
- `src/api/FinanceApi.ts` exports the interface plus `NewFund, NewBill, NewExpendable, NewDebt, NewDebtPayment, NewSavings, NewSavingsTransfer`.
- `src/lib/summary.ts` exports `computeSummary(data, month)`.
- `src/lib/currentMonth.ts` exports `monthKey(date?)`.
- `src/components/Card.tsx` (`Card`), `src/components/Money.tsx` (`Money`).
- `src/App.tsx` routes `/funds /bills /expendable /debts /savings` to `<Placeholder/>`.

---

## File Structure (this plan)

```
src/
  lib/currentMonth.ts          # MODIFY: add isoDate()
  components/
    ui.tsx                     # CREATE: Field, TextInput, SelectInput, Button, inputClass
    Table.tsx                  # CREATE: Table wrapper
  hooks/
    useFinanceMutations.ts     # CREATE: all write mutations + cache invalidation
  pages/
    Funds.tsx                  # CREATE
    Bills.tsx                  # CREATE
    Expendable.tsx             # CREATE
    Debts.tsx                  # CREATE
    Savings.tsx                # CREATE
    Placeholder.tsx            # DELETE (final task)
  App.tsx                      # MODIFY (final task): wire real pages
```

---

## Task 1: Shared helpers and UI primitives

**Files:**
- Modify: `src/lib/currentMonth.ts`
- Create: `src/components/ui.tsx`
- Create: `src/components/Table.tsx`

- [ ] **Step 1: Add `isoDate` to the date helper**

Append to `src/lib/currentMonth.ts` (keep the existing `monthKey`):

```ts
/** Returns the local yyyy-mm-dd string for the given date (defaults to now). */
export function isoDate(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
```

- [ ] **Step 2: Create the form primitives**

Create `src/components/ui.tsx`:

```tsx
import type {
  ReactNode,
  InputHTMLAttributes,
  SelectHTMLAttributes,
  ButtonHTMLAttributes,
} from 'react'

export const inputClass =
  'rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900 focus:border-slate-500 focus:outline-none'

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-slate-600">{label}</span>
      {children}
    </label>
  )
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className, ...rest } = props
  return <input {...rest} className={`${inputClass} ${className ?? ''}`} />
}

export function SelectInput(props: SelectHTMLAttributes<HTMLSelectElement>) {
  const { className, children, ...rest } = props
  return (
    <select {...rest} className={`${inputClass} ${className ?? ''}`}>
      {children}
    </select>
  )
}

export function Button(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className, children, ...rest } = props
  return (
    <button
      {...rest}
      className={`rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 ${className ?? ''}`}
    >
      {children}
    </button>
  )
}
```

- [ ] **Step 3: Create the Table wrapper**

Create `src/components/Table.tsx`:

```tsx
import type { ReactNode } from 'react'

export function Table({ headers, children }: { headers: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-slate-500">
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-3 py-2 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-slate-800">{children}</tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 4: Verify it compiles**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/currentMonth.ts src/components/ui.tsx src/components/Table.tsx
git commit -m "feat: add isoDate helper and shared UI primitives"
```

---

## Task 2: Mutations hook

**Files:**
- Create: `src/hooks/useFinanceMutations.ts`

- [ ] **Step 1: Write the mutations hook**

Every mutation invalidates `financeKey` on success so reads (dashboard + all screens) refresh. Create `src/hooks/useFinanceMutations.ts`:

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { getApi } from '../api/index.ts'
import { financeKey } from './useFinanceData.ts'
import type {
  NewFund,
  NewBill,
  NewExpendable,
  NewDebt,
  NewDebtPayment,
  NewSavings,
  NewSavingsTransfer,
} from '../api/FinanceApi.ts'

export function useFinanceMutations() {
  const qc = useQueryClient()
  const onSuccess = () => {
    void qc.invalidateQueries({ queryKey: financeKey })
  }

  const addFund = useMutation({ mutationFn: (i: NewFund) => getApi().addFund(i), onSuccess })
  const addBill = useMutation({ mutationFn: (i: NewBill) => getApi().addBill(i), onSuccess })
  const setBillPaid = useMutation({
    mutationFn: (v: { id: number; paid: boolean }) => getApi().setBillPaid(v.id, v.paid),
    onSuccess,
  })
  const addExpendable = useMutation({
    mutationFn: (i: NewExpendable) => getApi().addExpendable(i),
    onSuccess,
  })
  const setMonthlyBudget = useMutation({
    mutationFn: (v: { month: string; amount: number }) =>
      getApi().setMonthlyBudget(v.month, v.amount),
    onSuccess,
  })
  const addDebt = useMutation({ mutationFn: (i: NewDebt) => getApi().addDebt(i), onSuccess })
  const payDebt = useMutation({
    mutationFn: (i: NewDebtPayment) => getApi().payDebt(i),
    onSuccess,
  })
  const addSavings = useMutation({
    mutationFn: (i: NewSavings) => getApi().addSavings(i),
    onSuccess,
  })
  const transferSavings = useMutation({
    mutationFn: (i: NewSavingsTransfer) => getApi().transferSavingsToFunds(i),
    onSuccess,
  })

  return {
    addFund,
    addBill,
    setBillPaid,
    addExpendable,
    setMonthlyBudget,
    addDebt,
    payDebt,
    addSavings,
    transferSavings,
  }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useFinanceMutations.ts
git commit -m "feat: add finance mutations hook"
```

---

## Task 3: Funds page

**Files:**
- Create: `src/pages/Funds.tsx`

- [ ] **Step 1: Write the Funds page**

Create `src/pages/Funds.tsx`:

```tsx
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
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/Funds.tsx
git commit -m "feat: add Funds module page"
```

---

## Task 4: Bills page

**Files:**
- Create: `src/pages/Bills.tsx`

- [ ] **Step 1: Write the Bills page**

The paid checkbox triggers `setBillPaid`, which invalidates the query → balance updates everywhere. Create `src/pages/Bills.tsx`:

```tsx
import { useState } from 'react'
import type { FormEvent } from 'react'
import { useFinanceData } from '../hooks/useFinanceData.ts'
import { useFinanceMutations } from '../hooks/useFinanceMutations.ts'
import { isoDate } from '../lib/currentMonth.ts'
import { Card } from '../components/Card.tsx'
import { Money } from '../components/Money.tsx'
import { Table } from '../components/Table.tsx'
import { Field, TextInput, Button } from '../components/ui.tsx'

export function Bills() {
  const { data, isLoading } = useFinanceData()
  const { addBill, setBillPaid } = useFinanceMutations()
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [dueDate, setDueDate] = useState(isoDate())
  const [notes, setNotes] = useState('')

  if (isLoading || !data) return <p className="text-slate-500">Loading…</p>

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
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/Bills.tsx
git commit -m "feat: add Bills module page"
```

---

## Task 5: Expendable page

**Files:**
- Create: `src/pages/Expendable.tsx`

- [ ] **Step 1: Write the Expendable page**

Shows the current month's budget (editable → `setMonthlyBudget`), spent, and remaining (via `computeSummary`), plus a daily-entry form and this month's entries. The `BudgetEditor` child seeds its input from the current budget at mount. Create `src/pages/Expendable.tsx`:

```tsx
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
  const { data, isLoading } = useFinanceData()
  const { addExpendable } = useFinanceMutations()
  const month = monthKey()
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(isoDate())
  const [notes, setNotes] = useState('')

  if (isLoading || !data) return <p className="text-slate-500">Loading…</p>

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
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/Expendable.tsx
git commit -m "feat: add Expendable module page"
```

---

## Task 6: Debts page

**Files:**
- Create: `src/pages/Debts.tsx`

- [ ] **Step 1: Write the Debts page**

Add-debt form (remaining seeds from total), record-payment form (debt dropdown → `payDebt`), debts table, and payment history. Create `src/pages/Debts.tsx`:

```tsx
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
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/Debts.tsx
git commit -m "feat: add Debts module page"
```

---

## Task 7: Savings page

**Files:**
- Create: `src/pages/Savings.tsx`

- [ ] **Step 1: Write the Savings page**

Savings Total card, add-savings form (source dropdown), savings entries, transfer-to-funds form, and transfers list. Create `src/pages/Savings.tsx`:

```tsx
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

export function Savings() {
  const { data, isLoading } = useFinanceData()
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

  if (isLoading || !data) return <p className="text-slate-500">Loading…</p>

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
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/Savings.tsx
git commit -m "feat: add Savings module page"
```

---

## Task 8: Wire routes, remove placeholder, verify

**Files:**
- Modify: `src/App.tsx`
- Delete: `src/pages/Placeholder.tsx`

- [ ] **Step 1: Rewrite App.tsx to route the real pages**

Overwrite `src/App.tsx` (removes the `Placeholder` import and all `<Placeholder/>` usages):

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext.tsx'
import { useAuth } from './auth/useAuth.ts'
import { AppShell } from './components/AppShell.tsx'
import { Dashboard } from './pages/Dashboard.tsx'
import { Funds } from './pages/Funds.tsx'
import { Bills } from './pages/Bills.tsx'
import { Expendable } from './pages/Expendable.tsx'
import { Debts } from './pages/Debts.tsx'
import { Savings } from './pages/Savings.tsx'
import { SignIn } from './pages/SignIn.tsx'

const queryClient = new QueryClient()

function AuthedApp() {
  const { user } = useAuth()
  if (!user) return <SignIn />
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Dashboard />} />
        <Route path="funds" element={<Funds />} />
        <Route path="bills" element={<Bills />} />
        <Route path="expendable" element={<Expendable />} />
        <Route path="debts" element={<Debts />} />
        <Route path="savings" element={<Savings />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <AuthedApp />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
```

- [ ] **Step 2: Delete the now-unused placeholder**

```bash
git rm src/pages/Placeholder.tsx
```

- [ ] **Step 3: Typecheck and build**

Run: `npx tsc -b`
Expected: no errors.

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Manual smoke check**

Run: `npm run dev`, open the URL, sign in (stub).
Expected:
- **Funds:** add a fund → it appears in the table; Dashboard "Total Funds" increases.
- **Bills:** toggle a bill's paid checkbox → Dashboard "Bills Paid" + "Remaining Balance" update.
- **Expendable:** set the budget and log a daily amount → "Spent This Month"/"Remaining Expendable" update.
- **Debts:** add a debt, record a payment → its `remaining` drops and payment appears in history; Dashboard "Remaining Balance" reflects the payment.
- **Savings:** add savings and transfer some back → a "Savings" fund entry appears on the Funds page; Savings Total updates.
- All styling is Tailwind; no console errors.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wire module pages and remove placeholder"
```

---

## Done — Plan 2 outcome

All six modules are fully interactive against the mock adapter, with cross-module actions wired and the dashboard staying in sync via query invalidation. Plan 3 adds the Apps Script backend, real Google Sign-In, and GitHub Pages deploy.
