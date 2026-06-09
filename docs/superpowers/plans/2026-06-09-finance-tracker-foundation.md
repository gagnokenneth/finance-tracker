# Finance Tracker — Foundation Implementation Plan (Plan 1 of 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **No automated tests:** Per project preference, this plan creates NO test files. Verify each task with `npx tsc -b`, `npm run build`, and the manual smoke check at the end.

**Goal:** Stand up a working finance app running on seeded mock data, with Tailwind styling, tab navigation, a summary engine, and a real Dashboard — module screens come in Plan 2, the live backend in Plan 3.

**Architecture:** React + Vite + TS frontend. All server state flows through a single `FinanceApi` interface; this plan implements the `MockApi` adapter (seeded localStorage). A pure `computeSummary` function derives all dashboard numbers. TanStack Query owns fetching/caching; React Router provides a top tab bar. Auth is a stub here (real Google Sign-In is Plan 3).

**Tech Stack:** React 19, TypeScript 6 (`verbatimModuleSyntax` → use `import type`; imports include `.ts`/`.tsx` extensions), Vite 8, Tailwind CSS v4 (`@tailwindcss/vite`, no config file), `react-router-dom`, `@tanstack/react-query`.

Reference spec: `docs/superpowers/specs/2026-06-09-personal-finance-tracker-design.md`

---

## File Structure

```
src/
  types.ts                     # domain types + FinanceData aggregate
  lib/
    money.ts                   # currency formatting
    summary.ts                 # computeSummary (pure)
    currentMonth.ts            # current-month helper
  api/
    FinanceApi.ts              # the interface + DTO types
    index.ts                   # adapter selector (VITE_API_MODE)
    mock/
      seed.ts                  # initial seed dataset
      MockApi.ts               # localStorage-backed implementation
  auth/
    AuthContext.tsx            # auth state (stubbed sign-in)
    useAuth.ts
  components/
    AppShell.tsx               # tab bar + <Outlet/>
    Card.tsx                   # reusable metric/section card
    Money.tsx                  # formatted money span
  pages/
    Dashboard.tsx              # real summary dashboard
    Placeholder.tsx            # "coming in Plan 2" stub for module routes
    SignIn.tsx                 # sign-in gate
  hooks/
    useFinanceData.ts          # TanStack Query hook over the API
  App.tsx                      # providers + router
  main.tsx                     # entry (Tailwind import)
  index.css                    # ONLY Tailwind entry: @import "tailwindcss";
  env.d.ts                     # env var typing
```

Removed: `src/App.css`, the custom styles in `src/index.css`, the demo `App.tsx` body.

---

## Task 1: Install dependencies and Tailwind v4

**Files:**
- Modify: `package.json` (via npm)
- Modify: `vite.config.ts`
- Modify: `src/index.css`

- [ ] **Step 1: Install runtime + dev dependencies**

```bash
npm install react-router-dom @tanstack/react-query
npm install -D tailwindcss @tailwindcss/vite
```

- [ ] **Step 2: Add the Tailwind Vite plugin**

Replace `vite.config.ts` with:

```ts
import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
  ],
})
```

- [ ] **Step 3: Replace index.css with the Tailwind entry only**

Overwrite `src/index.css` with exactly:

```css
@import "tailwindcss";
```

- [ ] **Step 4: Delete the demo stylesheet**

```bash
git rm src/App.css
```

- [ ] **Step 5: Verify install + typecheck**

Run: `npx tsc -b`
Expected: no type errors.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: add Tailwind v4, router, and query deps"
```

---

## Task 2: Domain types

**Files:**
- Create: `src/types.ts`

- [ ] **Step 1: Write the domain types**

Create `src/types.ts`:

```ts
export type DebtType = 'straight' | 'installment'
export type SavingsSource = 'funds' | 'remaining_expendable'

export interface FundEntry {
  id: number
  source: string
  amount: number
  date: string // ISO yyyy-mm-dd
  notes?: string
}

export interface Bill {
  id: number
  name: string
  amount: number
  due_date: string
  paid: boolean
  notes?: string
}

export interface ExpendableEntry {
  id: number
  month: string // yyyy-mm
  daily_amount: number
  date: string
  notes?: string
}

export interface Debt {
  id: number
  name: string
  total_amount: number
  remaining: number
  type: DebtType
  interest_rate: number
  notes?: string
}

export interface DebtPayment {
  id: number
  debt_id: number
  amount_paid: number
  date: string
  notes?: string
}

export interface SavingsEntry {
  id: number
  date: string
  amount: number
  source: SavingsSource
  total: number // computed running total at write time
  notes?: string
}

export interface SavingsTransfer {
  id: number
  date: string
  amount: number
  notes?: string
}

export interface Settings {
  // monthly expendable budget keyed by yyyy-mm
  monthlyBudgets: Record<string, number>
  allowedEmails: string[]
}

/** All sheets, as the frontend holds them in memory. */
export interface FinanceData {
  funds: FundEntry[]
  bills: Bill[]
  expendable: ExpendableEntry[]
  debts: Debt[]
  debt_payments: DebtPayment[]
  savings: SavingsEntry[]
  savings_transfers: SavingsTransfer[]
  settings: Settings
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat: add domain types"
```

---

## Task 3: Money formatting helper

**Files:**
- Create: `src/lib/money.ts`

- [ ] **Step 1: Write the implementation**

Create `src/lib/money.ts`:

```ts
const fmt = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

/** Formats a number as USD, e.g. 1234.5 -> "$1,234.50", -50 -> "-$50.00". */
export function formatMoney(amount: number): string {
  return fmt.format(amount)
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/money.ts
git commit -m "feat: add money formatting helper"
```

---

## Task 4: Current-month helper

**Files:**
- Create: `src/lib/currentMonth.ts`

- [ ] **Step 1: Write the helper**

Create `src/lib/currentMonth.ts`:

```ts
/** Returns the yyyy-mm string for the given date (defaults to now). */
export function monthKey(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/currentMonth.ts
git commit -m "feat: add month-key helper"
```

---

## Task 5: The summary engine (`computeSummary`)

**Files:**
- Create: `src/lib/summary.ts`

- [ ] **Step 1: Write the implementation**

Create `src/lib/summary.ts`. This is the single source of truth for all dashboard math, per the spec formulas (Remaining Balance subtracts Savings Total).

```ts
import type { FinanceData } from '../types.ts'

export interface Summary {
  totalFunds: number
  totalBills: number
  billsPaid: number
  monthlyExpendable: number
  spentThisMonth: number
  remainingExpendable: number
  totalDebt: number
  savingsTotal: number
  remainingBalance: number
}

const sum = (ns: number[]): number => ns.reduce((a, b) => a + b, 0)

export function computeSummary(data: FinanceData, month: string): Summary {
  const totalFunds = sum(data.funds.map((f) => f.amount))
  const totalBills = sum(data.bills.map((b) => b.amount))
  const billsPaid = sum(data.bills.filter((b) => b.paid).map((b) => b.amount))
  const monthlyExpendable = data.settings.monthlyBudgets[month] ?? 0
  const spentThisMonth = sum(
    data.expendable.filter((e) => e.month === month).map((e) => e.daily_amount),
  )
  const remainingExpendable = monthlyExpendable - spentThisMonth
  const totalDebt = sum(data.debts.map((d) => d.remaining))
  const debtPayments = sum(data.debt_payments.map((p) => p.amount_paid))
  const savingsTotal =
    sum(data.savings.map((s) => s.amount)) -
    sum(data.savings_transfers.map((t) => t.amount))
  const remainingBalance =
    totalFunds - billsPaid - monthlyExpendable - debtPayments - savingsTotal

  return {
    totalFunds,
    totalBills,
    billsPaid,
    monthlyExpendable,
    spentThisMonth,
    remainingExpendable,
    totalDebt,
    savingsTotal,
    remainingBalance,
  }
}
```

> Sanity reference (used in the seed and manual smoke check): with the seed data,
> 6000 funds − 1500 bills paid − 900 budget − 800 debt payment − 300 savings = **2500**.

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/summary.ts
git commit -m "feat: add summary engine"
```

---

## Task 6: The `FinanceApi` interface

**Files:**
- Create: `src/api/FinanceApi.ts`

- [ ] **Step 1: Define the interface and input DTOs**

Create `src/api/FinanceApi.ts`. The interface covers everything Plans 1–3 need; the mock implements it now, the Apps Script adapter implements it in Plan 3.

```ts
import type {
  FinanceData,
  FundEntry,
  Bill,
  ExpendableEntry,
  Debt,
  DebtPayment,
  SavingsEntry,
  SavingsTransfer,
} from '../types.ts'

// Inputs omit server-assigned fields.
export type NewFund = Omit<FundEntry, 'id'>
export type NewBill = Omit<Bill, 'id'>
export type NewExpendable = Omit<ExpendableEntry, 'id'>
export type NewDebt = Omit<Debt, 'id'>
export type NewDebtPayment = Omit<DebtPayment, 'id'>
export type NewSavings = Omit<SavingsEntry, 'id' | 'total'>
export type NewSavingsTransfer = Omit<SavingsTransfer, 'id'>

export interface FinanceApi {
  /** Read every sheet at once (dashboard + all module views derive from this). */
  getAll(): Promise<FinanceData>

  addFund(input: NewFund): Promise<FundEntry>

  addBill(input: NewBill): Promise<Bill>
  setBillPaid(id: number, paid: boolean): Promise<Bill>

  addExpendable(input: NewExpendable): Promise<ExpendableEntry>
  setMonthlyBudget(month: string, amount: number): Promise<void>

  addDebt(input: NewDebt): Promise<Debt>
  /** Records a payment AND reduces the debt's remaining balance. */
  payDebt(input: NewDebtPayment): Promise<{ payment: DebtPayment; debt: Debt }>

  /** Adds a savings entry; returns it with its computed running total. */
  addSavings(input: NewSavings): Promise<SavingsEntry>
  /** Moves money back to funds: creates a transfer AND a funds entry labeled "Savings". */
  transferSavingsToFunds(
    input: NewSavingsTransfer,
  ): Promise<{ transfer: SavingsTransfer; fund: FundEntry }>
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/api/FinanceApi.ts
git commit -m "feat: define FinanceApi interface"
```

---

## Task 7: Seed data

**Files:**
- Create: `src/api/mock/seed.ts`

- [ ] **Step 1: Write the seed dataset**

Create `src/api/mock/seed.ts`. Values mirror the spec worked example so the Dashboard shows meaningful numbers.

```ts
import type { FinanceData } from '../../types.ts'

export function createSeed(): FinanceData {
  return {
    funds: [
      { id: 1, source: 'Salary', amount: 5000, date: '2026-06-01' },
      { id: 2, source: 'Freelance', amount: 1000, date: '2026-06-10' },
    ],
    bills: [
      { id: 1, name: 'Rent', amount: 1500, due_date: '2026-06-05', paid: true },
      { id: 2, name: 'Electricity', amount: 200, due_date: '2026-06-15', paid: false },
    ],
    expendable: [
      { id: 1, month: '2026-06', daily_amount: 100, date: '2026-06-02' },
      { id: 2, month: '2026-06', daily_amount: 50, date: '2026-06-03' },
    ],
    debts: [
      { id: 1, name: 'Credit Card', total_amount: 2000, remaining: 1200, type: 'straight', interest_rate: 0 },
    ],
    debt_payments: [
      { id: 1, debt_id: 1, amount_paid: 800, date: '2026-06-07' },
    ],
    savings: [
      { id: 1, date: '2026-06-01', amount: 500, source: 'funds', total: 500 },
    ],
    savings_transfers: [
      { id: 1, date: '2026-06-20', amount: 200 },
    ],
    settings: {
      monthlyBudgets: { '2026-06': 900 },
      allowedEmails: ['ken.gagno@vibeteams.ai'],
    },
  }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/api/mock/seed.ts
git commit -m "feat: add mock seed data"
```

---

## Task 8: The MockApi adapter

**Files:**
- Create: `src/api/mock/MockApi.ts`

- [ ] **Step 1: Write the implementation**

Create `src/api/mock/MockApi.ts`:

```ts
import type { FinanceApi, NewFund, NewBill, NewExpendable, NewDebt, NewDebtPayment, NewSavings, NewSavingsTransfer } from '../FinanceApi.ts'
import type { FinanceData, FundEntry, Bill, ExpendableEntry, Debt, DebtPayment, SavingsEntry, SavingsTransfer } from '../../types.ts'
import { createSeed } from './seed.ts'

const KEY = 'finance-mock-db'

function nextId<T extends { id: number }>(rows: T[]): number {
  return rows.reduce((max, r) => Math.max(max, r.id), 0) + 1
}

export class MockApi implements FinanceApi {
  private load(): FinanceData {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as FinanceData
    const seed = createSeed()
    this.save(seed)
    return seed
  }

  private save(data: FinanceData): void {
    localStorage.setItem(KEY, JSON.stringify(data))
  }

  // Simulate a little latency so loading states are exercised in the UI.
  private async delay<T>(value: T): Promise<T> {
    await new Promise((r) => setTimeout(r, 80))
    return value
  }

  async getAll(): Promise<FinanceData> {
    return this.delay(this.load())
  }

  async addFund(input: NewFund): Promise<FundEntry> {
    const data = this.load()
    const fund: FundEntry = { id: nextId(data.funds), ...input }
    data.funds.push(fund)
    this.save(data)
    return this.delay(fund)
  }

  async addBill(input: NewBill): Promise<Bill> {
    const data = this.load()
    const bill: Bill = { id: nextId(data.bills), ...input }
    data.bills.push(bill)
    this.save(data)
    return this.delay(bill)
  }

  async setBillPaid(id: number, paid: boolean): Promise<Bill> {
    const data = this.load()
    const bill = data.bills.find((b) => b.id === id)
    if (!bill) throw new Error(`Bill ${id} not found`)
    bill.paid = paid
    this.save(data)
    return this.delay(bill)
  }

  async addExpendable(input: NewExpendable): Promise<ExpendableEntry> {
    const data = this.load()
    const entry: ExpendableEntry = { id: nextId(data.expendable), ...input }
    data.expendable.push(entry)
    this.save(data)
    return this.delay(entry)
  }

  async setMonthlyBudget(month: string, amount: number): Promise<void> {
    const data = this.load()
    data.settings.monthlyBudgets[month] = amount
    this.save(data)
    return this.delay(undefined)
  }

  async addDebt(input: NewDebt): Promise<Debt> {
    const data = this.load()
    const debt: Debt = { id: nextId(data.debts), ...input }
    data.debts.push(debt)
    this.save(data)
    return this.delay(debt)
  }

  async payDebt(input: NewDebtPayment): Promise<{ payment: DebtPayment; debt: Debt }> {
    const data = this.load()
    const debt = data.debts.find((d) => d.id === input.debt_id)
    if (!debt) throw new Error(`Debt ${input.debt_id} not found`)
    const payment: DebtPayment = { id: nextId(data.debt_payments), ...input }
    data.debt_payments.push(payment)
    debt.remaining = debt.remaining - input.amount_paid
    this.save(data)
    return this.delay({ payment, debt })
  }

  async addSavings(input: NewSavings): Promise<SavingsEntry> {
    const data = this.load()
    const priorTotal =
      data.savings.reduce((a, s) => a + s.amount, 0) -
      data.savings_transfers.reduce((a, t) => a + t.amount, 0)
    const entry: SavingsEntry = {
      id: nextId(data.savings),
      total: priorTotal + input.amount,
      ...input,
    }
    data.savings.push(entry)
    this.save(data)
    return this.delay(entry)
  }

  async transferSavingsToFunds(
    input: NewSavingsTransfer,
  ): Promise<{ transfer: SavingsTransfer; fund: FundEntry }> {
    const data = this.load()
    const transfer: SavingsTransfer = { id: nextId(data.savings_transfers), ...input }
    data.savings_transfers.push(transfer)
    const fund: FundEntry = {
      id: nextId(data.funds),
      source: 'Savings',
      amount: input.amount,
      date: input.date,
      notes: input.notes,
    }
    data.funds.push(fund)
    this.save(data)
    return this.delay({ transfer, fund })
  }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/api/mock/MockApi.ts
git commit -m "feat: add localStorage-backed MockApi adapter"
```

---

## Task 9: Adapter selector

**Files:**
- Create: `src/env.d.ts` (env var typing)
- Create: `src/api/index.ts`

- [ ] **Step 1: Type the env vars**

Create `src/env.d.ts`:

```ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_MODE?: 'mock' | 'live'
  readonly VITE_APPS_SCRIPT_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

- [ ] **Step 2: Write the selector**

Create `src/api/index.ts`. The Apps Script branch is wired in Plan 3; for now it falls back to mock with a console warning so the app always runs.

```ts
import type { FinanceApi } from './FinanceApi.ts'
import { MockApi } from './mock/MockApi.ts'

let instance: FinanceApi | null = null

export function getApi(): FinanceApi {
  if (instance) return instance
  const mode = import.meta.env.VITE_API_MODE ?? 'mock'
  if (mode === 'live') {
    // AppsScriptApi arrives in Plan 3; until then, warn and use mock.
    console.warn('VITE_API_MODE=live but AppsScriptApi is not implemented yet; using mock.')
  }
  instance = new MockApi()
  return instance
}

export type { FinanceApi } from './FinanceApi.ts'
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/env.d.ts src/api/index.ts
git commit -m "feat: add API adapter selector"
```

---

## Task 10: Auth stub (Context + hook)

**Files:**
- Create: `src/auth/AuthContext.tsx`
- Create: `src/auth/useAuth.ts`

- [ ] **Step 1: Write the auth context (stubbed sign-in)**

Real Google Sign-In lands in Plan 3. Here, `signIn()` immediately authenticates a stub user so route guards and the signed-in UI can be built now.

Create `src/auth/AuthContext.tsx`:

```tsx
import { createContext, useState, useCallback } from 'react'
import type { ReactNode } from 'react'

export interface AuthUser {
  email: string
  name: string
}

export interface AuthState {
  user: AuthUser | null
  signIn: () => void
  signOut: () => void
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthState | null>(null)

const STUB_USER: AuthUser = { email: 'ken.gagno@vibeteams.ai', name: 'Ken' }

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const signIn = useCallback(() => setUser(STUB_USER), [])
  const signOut = useCallback(() => setUser(null), [])
  return (
    <AuthContext.Provider value={{ user, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
```

- [ ] **Step 2: Write the hook**

Create `src/auth/useAuth.ts`:

```ts
import { useContext } from 'react'
import { AuthContext } from './AuthContext.tsx'
import type { AuthState } from './AuthContext.tsx'

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/auth/AuthContext.tsx src/auth/useAuth.ts
git commit -m "feat: add stubbed auth context"
```

---

## Task 11: Data hook (TanStack Query)

**Files:**
- Create: `src/hooks/useFinanceData.ts`

- [ ] **Step 1: Write the query hook**

Create `src/hooks/useFinanceData.ts`:

```ts
import { useQuery } from '@tanstack/react-query'
import { getApi } from '../api/index.ts'
import type { FinanceData } from '../types.ts'

export const financeKey = ['finance', 'all'] as const

export function useFinanceData() {
  return useQuery<FinanceData>({
    queryKey: financeKey,
    queryFn: () => getApi().getAll(),
  })
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useFinanceData.ts
git commit -m "feat: add finance data query hook"
```

---

## Task 12: Reusable UI components (Card, Money)

**Files:**
- Create: `src/components/Card.tsx`
- Create: `src/components/Money.tsx`

- [ ] **Step 1: Write the Card component**

Create `src/components/Card.tsx`:

```tsx
import type { ReactNode } from 'react'

export function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      {title && <h2 className="mb-2 text-sm font-medium text-slate-500">{title}</h2>}
      {children}
    </div>
  )
}
```

- [ ] **Step 2: Write the Money component**

Create `src/components/Money.tsx`:

```tsx
import { formatMoney } from '../lib/money.ts'

export function Money({ value, className }: { value: number; className?: string }) {
  const tone = value < 0 ? 'text-red-600' : 'text-slate-900'
  return <span className={`${tone} ${className ?? ''}`}>{formatMoney(value)}</span>
}
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/Card.tsx src/components/Money.tsx
git commit -m "feat: add Card and Money UI components"
```

---

## Task 13: Placeholder page for module routes

**Files:**
- Create: `src/pages/Placeholder.tsx`

- [ ] **Step 1: Write the placeholder**

Create `src/pages/Placeholder.tsx`:

```tsx
export function Placeholder({ name }: { name: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
      <h1 className="text-lg font-semibold text-slate-700">{name}</h1>
      <p className="mt-2 text-sm text-slate-500">This module arrives in Plan 2.</p>
    </div>
  )
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/Placeholder.tsx
git commit -m "feat: add module placeholder page"
```

---

## Task 14: Dashboard page

**Files:**
- Create: `src/pages/Dashboard.tsx`

- [ ] **Step 1: Write the Dashboard**

Create `src/pages/Dashboard.tsx`. Uses the current month via `monthKey()` and `computeSummary`.

```tsx
import { useFinanceData } from '../hooks/useFinanceData.ts'
import { computeSummary } from '../lib/summary.ts'
import { monthKey } from '../lib/currentMonth.ts'
import { Card } from '../components/Card.tsx'
import { Money } from '../components/Money.tsx'

export function Dashboard() {
  const { data, isLoading, isError } = useFinanceData()

  if (isLoading) return <p className="text-slate-500">Loading…</p>
  if (isError || !data) return <p className="text-red-600">Failed to load data.</p>

  const s = computeSummary(data, monthKey())

  const metrics: Array<{ label: string; value: number }> = [
    { label: 'Total Funds', value: s.totalFunds },
    { label: 'Total Bills', value: s.totalBills },
    { label: 'Bills Paid', value: s.billsPaid },
    { label: 'Monthly Expendable', value: s.monthlyExpendable },
    { label: 'Spent This Month', value: s.spentThisMonth },
    { label: 'Total Debt', value: s.totalDebt },
    { label: 'Savings Total', value: s.savingsTotal },
  ]

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-sm font-medium text-slate-500">Remaining Balance</h2>
        <Money value={s.remainingBalance} className="text-3xl font-bold" />
      </Card>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {metrics.map((m) => (
          <Card key={m.label} title={m.label}>
            <Money value={m.value} className="text-xl font-semibold" />
          </Card>
        ))}
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
git add src/pages/Dashboard.tsx
git commit -m "feat: add dashboard page"
```

---

## Task 15: App shell with tab bar

**Files:**
- Create: `src/components/AppShell.tsx`

- [ ] **Step 1: Write the shell**

Create `src/components/AppShell.tsx`. Uses `NavLink` for the top tabs with active styling, shows the signed-in user + sign-out, and renders the routed page via `<Outlet/>`.

```tsx
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.ts'

const TABS = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/funds', label: 'Funds' },
  { to: '/bills', label: 'Bills' },
  { to: '/expendable', label: 'Expendable' },
  { to: '/debts', label: 'Debts' },
  { to: '/savings', label: 'Savings' },
]

export function AppShell() {
  const { user, signOut } = useAuth()
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <span className="text-lg font-bold text-slate-900">Finance</span>
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <span>{user?.name}</span>
            <button
              type="button"
              onClick={signOut}
              className="rounded-md border border-slate-300 px-2 py-1 hover:bg-slate-100"
            >
              Sign out
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4">
          {TABS.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                `whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${
                  isActive
                    ? 'border-slate-900 text-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`
              }
            >
              {t.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/AppShell.tsx
git commit -m "feat: add app shell with tab navigation"
```

---

## Task 16: Sign-in gate + App wiring

**Files:**
- Create: `src/pages/SignIn.tsx`
- Rewrite: `src/App.tsx`
- Verify: `src/main.tsx`

- [ ] **Step 1: Write the sign-in screen**

Create `src/pages/SignIn.tsx`. In Plan 3 the button is replaced by the Google button; here it calls the stub `signIn()`.

```tsx
import { useAuth } from '../auth/useAuth.ts'

export function SignIn() {
  const { signIn } = useAuth()
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="mb-1 text-xl font-bold text-slate-900">Finance Tracker</h1>
        <p className="mb-6 text-sm text-slate-500">Sign in to continue</p>
        <button
          type="button"
          onClick={signIn}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          Sign in with Google
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Rewrite App.tsx with providers + router + guard**

Overwrite `src/App.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext.tsx'
import { useAuth } from './auth/useAuth.ts'
import { AppShell } from './components/AppShell.tsx'
import { Dashboard } from './pages/Dashboard.tsx'
import { Placeholder } from './pages/Placeholder.tsx'
import { SignIn } from './pages/SignIn.tsx'

const queryClient = new QueryClient()

function AuthedApp() {
  const { user } = useAuth()
  if (!user) return <SignIn />
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Dashboard />} />
        <Route path="funds" element={<Placeholder name="Funds" />} />
        <Route path="bills" element={<Placeholder name="Bills" />} />
        <Route path="expendable" element={<Placeholder name="Expendable" />} />
        <Route path="debts" element={<Placeholder name="Debts" />} />
        <Route path="savings" element={<Placeholder name="Savings" />} />
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

- [ ] **Step 3: Confirm main.tsx imports index.css**

`src/main.tsx` already imports `./index.css` (now the Tailwind entry). No change needed; verify it still reads:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 4: Typecheck + build**

Run: `npx tsc -b`
Expected: no errors.

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 5: Manual smoke check**

Run: `npm run dev`, open the URL.
Expected: Sign-in screen → click "Sign in with Google" → Dashboard shows Remaining Balance **$2,500.00** and the metric cards; tabs render placeholders; Tailwind styling is visibly applied.

- [ ] **Step 6: Commit**

```bash
git add src/pages/SignIn.tsx src/App.tsx
git commit -m "feat: wire providers, router, and sign-in gate"
```

---

## Done — Plan 1 outcome

A working, signed-in (stubbed) finance app on seeded mock data: a real Dashboard and tab navigation, with module screens stubbed. Plan 2 replaces the placeholders with full module screens; Plan 3 adds the Apps Script backend, real Google Sign-In, and GitHub Pages deploy.
