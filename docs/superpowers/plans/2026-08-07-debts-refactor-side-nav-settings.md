# Debts Refactor, Side Nav, and Settings — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the top navbar with a side navbar, expose only Debts and Settings, add a PHP/USD currency setting, and rebuild the Debts module around per-debt schedule rows with fixed and revolving types.

**Architecture:** Debt rows live in two flat sibling tables (`debt_schedule`, `debt_statements`) keyed by `debt_id`, mirroring how Google Sheets stores them. Schedule generation and all derived values are pure functions in `src/lib/`, so the two API adapters only persist. Currency is a derived value — backend Settings is the source of truth, localStorage is a first-paint cache.

**Tech Stack:** React 19, TypeScript ~6.0, Vite 8, React Router 7, TanStack Query 5, Tailwind 4, Google Apps Script backend.

## Global Constraints

- **Node 20.19+ or 22.12+ required** for the Vite 8 dev server. `.nvmrc` pins `24`.
- **No automated tests.** This project has none by deliberate convention. Verification is `npx tsc -b`, `npm run lint`, `npm run build`, plus manual checks in mock mode. Do not add a test framework.
- **No currency conversion.** The setting changes the rendered symbol and grouping only.
- **Dates are ISO `yyyy-mm-dd` strings** everywhere, never `Date` objects in state or storage.
- **No `setState` inside `useEffect`.** The repo's lint config rejects it (see commit `8f059fa`). Derive values during render instead.
- **Money is stored as a `number`**, matching the existing codebase. Do arithmetic in integer cents inside pure functions to avoid float drift, then convert back.
- Follow existing patterns: `Card`, `Table`, `Field`, `TextInput`, `SelectInput`, `Button` from `src/components/`, and the `NewX = Omit<X, 'id'>` input-type convention in `FinanceApi.ts`.

## File Structure

**Create:**
| File | Responsibility |
|---|---|
| `src/lib/debtSchedule.ts` | Pure fixed-schedule generation + month-stepping |
| `src/lib/debts.ts` | Pure derived values: next unpaid, total balance, due status |
| `src/lib/currency.ts` | Currency type, symbol table, localStorage cache |
| `src/hooks/useCurrency.ts` | Resolves active currency (backend → cache → default) |
| `src/components/Modal.tsx` | Shared dialog shell for add/edit/pay/confirm |
| `src/components/ConfirmDialog.tsx` | Destructive-action confirmation |
| `src/components/DueBadge.tsx` | Colour + text label for a due date |
| `src/pages/Settings.tsx` | Currency selector |
| `src/pages/DebtDetail.tsx` | One debt: rows, pay, edit, delete |
| `src/pages/debts/AddDebtModal.tsx` | Create fixed or revolving debt |
| `src/pages/debts/RowFormModal.tsx` | Add/edit a schedule row or statement |
| `src/pages/debts/PayModal.tsx` | Record a payment against a row |

**Modify:**
| File | Change |
|---|---|
| `src/types.ts` | New debt model; `Currency`; drop `DebtPayment` |
| `src/lib/money.ts` | `formatMoney(amount, currency)` |
| `src/components/Money.tsx` | Read currency from hook |
| `src/components/AppShell.tsx` | Top nav → sidebar + mobile drawer |
| `src/App.tsx` | Register only Debts/Settings; redirects |
| `src/api/FinanceApi.ts` | New debt + currency methods |
| `src/api/mock/MockApi.ts` | Implement them |
| `src/api/appsScript/AppsScriptApi.ts` | Implement them |
| `src/api/mock/seed.ts` | Empty debts; `currency: 'PHP'` |
| `src/hooks/useFinanceMutations.ts` | New mutations |
| `src/lib/summary.ts` | Recompute debt totals from new tables |
| `src/pages/Debts.tsx` | Rebuilt index view |
| `apps-script/Code.gs` | New sheets and actions |

**Milestones:** M1 = Tasks 1–4 (data layer, **risk-touching — money and data loss, review required**). M2 = Tasks 5–6 (shell). M3 = Tasks 7–8 (debts UI, **risk-touching — money, review required**).

---

### Task 1: Currency foundation

**Files:**
- Create: `src/lib/currency.ts`, `src/hooks/useCurrency.ts`
- Modify: `src/types.ts`, `src/lib/money.ts`, `src/components/Money.tsx`

**Interfaces:**
- Produces: `Currency`, `CURRENCY_LABELS`, `readCachedCurrency()`, `writeCachedCurrency(c)`, `formatMoney(amount, currency)`, `useCurrency()`.
- Consumed by: every task that renders money.

- [ ] **Step 1: Add the `Currency` type and extend `Settings`**

In `src/types.ts`:

```ts
export type Currency = 'PHP' | 'USD'
```

And add to the existing `Settings` interface:

```ts
export interface Settings {
  monthlyBudgets: Record<string, number>
  allowedEmails: string[]
  currency: Currency
}
```

- [ ] **Step 2: Create `src/lib/currency.ts`**

```ts
import type { Currency } from '../types.ts'

export const DEFAULT_CURRENCY: Currency = 'PHP'

export const CURRENCY_LABELS: Record<Currency, string> = {
  PHP: '₱  Philippine Peso (PHP)',
  USD: '$  US Dollar (USD)',
}

const CACHE_KEY = 'finance.currency'

function isCurrency(v: unknown): v is Currency {
  return v === 'PHP' || v === 'USD'
}

/** Last known currency, for correct symbol on first paint before data loads. */
export function readCachedCurrency(): Currency | null {
  const raw = localStorage.getItem(CACHE_KEY)
  return isCurrency(raw) ? raw : null
}

export function writeCachedCurrency(c: Currency): void {
  localStorage.setItem(CACHE_KEY, c)
}
```

- [ ] **Step 3: Make `formatMoney` currency-aware**

Replace all of `src/lib/money.ts`:

```ts
import type { Currency } from '../types.ts'

// Intl.NumberFormat construction is not free; reuse one per currency.
const formatters = new Map<Currency, Intl.NumberFormat>()

function formatterFor(currency: Currency): Intl.NumberFormat {
  const cached = formatters.get(currency)
  if (cached) return cached
  const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency })
  formatters.set(currency, fmt)
  return fmt
}

/** Formats an amount in the given currency, e.g. 1234.5 -> "₱1,234.50". */
export function formatMoney(amount: number, currency: Currency): string {
  return formatterFor(currency).format(amount)
}
```

- [ ] **Step 4: Create `src/hooks/useCurrency.ts`**

The currency is **derived during render**, never stored in state — this is what keeps it clear of the no-setState-in-effect rule. The effect only writes to localStorage.

```ts
import { useEffect } from 'react'
import { useFinanceData } from './useFinanceData.ts'
import { DEFAULT_CURRENCY, readCachedCurrency, writeCachedCurrency } from '../lib/currency.ts'
import type { Currency } from '../types.ts'

/**
 * Active currency. Backend Settings is the source of truth; the localStorage
 * cache supplies a correct symbol on first paint, before data has loaded.
 */
export function useCurrency(): Currency {
  const { data } = useFinanceData()
  const fromServer = data?.settings.currency
  const currency = fromServer ?? readCachedCurrency() ?? DEFAULT_CURRENCY

  useEffect(() => {
    if (fromServer) writeCachedCurrency(fromServer)
  }, [fromServer])

  return currency
}
```

- [ ] **Step 5: Wire `<Money>` to the hook**

Replace all of `src/components/Money.tsx`:

```ts
import { formatMoney } from '../lib/money.ts'
import { useCurrency } from '../hooks/useCurrency.ts'

export function Money({ value, className }: { value: number; className?: string }) {
  const currency = useCurrency()
  const tone = value < 0 ? 'text-red-600' : 'text-slate-900'
  return <span className={`${tone} ${className ?? ''}`}>{formatMoney(value, currency)}</span>
}
```

- [ ] **Step 6: Verify and commit**

`npx tsc -b` will still fail here — `seed.ts` has no `currency` field yet, and that is fixed in Task 3. Confirm the only errors are that missing field, then commit.

```bash
git add src/lib/currency.ts src/hooks/useCurrency.ts src/types.ts src/lib/money.ts src/components/Money.tsx
git commit -m "feat: make money formatting currency-aware"
```

---

### Task 2: Debt model and pure logic

**Files:**
- Create: `src/lib/debtSchedule.ts`, `src/lib/debts.ts`
- Modify: `src/types.ts`

**Interfaces:**
- Consumes: `isoDate` from `src/lib/currentMonth.ts`.
- Produces: `Debt`, `DebtScheduleRow`, `DebtStatement`, `buildSchedule()`, `addMonthsClamped()`, `nextUnpaid()`, `totalBalance()`, `dueStatus()`, `DueStatus`.

- [ ] **Step 1: Replace the debt types**

In `src/types.ts`, replace the `DebtType`, `Debt`, and `DebtPayment` declarations:

```ts
export type DebtType = 'fixed' | 'revolving'

export interface Debt {
  id: number
  name: string
  type: DebtType
}

/** One installment of a fixed debt. */
export interface DebtScheduleRow {
  id: number
  debt_id: number
  due_date: string // ISO yyyy-mm-dd
  amount: number
  paid: boolean
  paid_date?: string
  paid_amount?: number
}

/** One statement of a revolving debt. */
export interface DebtStatement {
  id: number
  debt_id: number
  due_date: string
  min_due: number
  total_due: number
  outstanding: number
  paid: boolean
  paid_date?: string
  paid_amount?: number
}
```

Delete the `DebtPayment` interface entirely. Update `FinanceData`:

```ts
export interface FinanceData {
  funds: FundEntry[]
  bills: Bill[]
  expendable: ExpendableEntry[]
  debts: Debt[]
  debt_schedule: DebtScheduleRow[]
  debt_statements: DebtStatement[]
  savings: SavingsEntry[]
  savings_transfers: SavingsTransfer[]
  settings: Settings
}
```

(`debt_payments` is removed.)

- [ ] **Step 2: Create `src/lib/debtSchedule.ts`**

Two behaviours matter: month stepping clamps to end-of-month, and the rounding remainder lands on the final row so the rows sum exactly to the total.

```ts
import { isoDate } from './currentMonth.ts'

/**
 * Adds n months to an ISO date, clamping to the last valid day of the target
 * month. 2026-01-31 + 1 month is 2026-02-28, not 2026-03-03.
 */
export function addMonthsClamped(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const target = new Date(y, m - 1 + n, 1)
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
  target.setDate(Math.min(d, lastDay))
  return isoDate(target)
}

export interface GeneratedRow {
  due_date: string
  amount: number
  paid: boolean
}

/**
 * Splits `total` across `months` monthly installments starting at
 * `firstDueDate`. Works in integer cents; the last row absorbs the remainder
 * so the rows sum to exactly `total`.
 */
export function buildSchedule(
  firstDueDate: string,
  total: number,
  months: number,
): GeneratedRow[] {
  if (!Number.isInteger(months) || months < 1) {
    throw new Error('Number of months must be a whole number of at least 1')
  }
  if (!(total > 0)) {
    throw new Error('Total balance must be greater than zero')
  }
  const totalCents = Math.round(total * 100)
  const perCents = Math.floor(totalCents / months)
  const rows: GeneratedRow[] = []
  for (let i = 0; i < months; i++) {
    const isLast = i === months - 1
    const cents = isLast ? totalCents - perCents * (months - 1) : perCents
    rows.push({
      due_date: addMonthsClamped(firstDueDate, i),
      amount: cents / 100,
      paid: false,
    })
  }
  return rows
}
```

- [ ] **Step 3: Create `src/lib/debts.ts`**

```ts
import { isoDate } from './currentMonth.ts'
import type { Debt, DebtScheduleRow, DebtStatement } from '../types.ts'

export type DueStatus = 'late' | 'due-soon' | 'upcoming'

/** Rows of either kind share the fields these helpers need. */
interface DueRow {
  due_date: string
  paid: boolean
}

const DUE_SOON_DAYS = 7

function daysBetween(from: string, to: string): number {
  const a = new Date(`${from}T00:00:00`).getTime()
  const b = new Date(`${to}T00:00:00`).getTime()
  return Math.round((b - a) / 86_400_000)
}

export function dueStatus(dueDate: string, today: string = isoDate()): DueStatus {
  const days = daysBetween(today, dueDate)
  if (days < 0) return 'late'
  if (days <= DUE_SOON_DAYS) return 'due-soon'
  return 'upcoming'
}

export const DUE_STATUS_LABEL: Record<DueStatus, string> = {
  late: 'Late',
  'due-soon': 'Due soon',
  upcoming: 'Upcoming',
}

/** Colour never carries meaning alone — always pair with DUE_STATUS_LABEL. */
export const DUE_STATUS_CLASS: Record<DueStatus, string> = {
  late: 'bg-red-50 text-red-700 ring-red-600/20',
  'due-soon': 'bg-amber-50 text-amber-700 ring-amber-600/20',
  upcoming: 'bg-slate-50 text-slate-600 ring-slate-500/20',
}

/** Earliest unpaid row by due date, or null when everything is settled. */
export function nextUnpaid<T extends DueRow>(rows: T[]): T | null {
  const unpaid = rows.filter((r) => !r.paid)
  if (unpaid.length === 0) return null
  return unpaid.reduce((best, r) => (r.due_date < best.due_date ? r : best))
}

export function scheduleFor(rows: DebtScheduleRow[], debtId: number): DebtScheduleRow[] {
  return rows
    .filter((r) => r.debt_id === debtId)
    .sort((a, b) => a.due_date.localeCompare(b.due_date))
}

export function statementsFor(rows: DebtStatement[], debtId: number): DebtStatement[] {
  return rows
    .filter((r) => r.debt_id === debtId)
    .sort((a, b) => a.due_date.localeCompare(b.due_date))
}

/**
 * Remaining balance. For a fixed debt this is the sum of unpaid installments.
 * For a revolving debt it is the outstanding balance of the latest statement —
 * a card balance is not a sum of its statements.
 */
export function totalBalance(
  debt: Debt,
  schedule: DebtScheduleRow[],
  statements: DebtStatement[],
): number {
  if (debt.type === 'fixed') {
    return scheduleFor(schedule, debt.id)
      .filter((r) => !r.paid)
      .reduce((sum, r) => sum + r.amount, 0)
  }
  const rows = statementsFor(statements, debt.id)
  if (rows.length === 0) return 0
  return rows[rows.length - 1].outstanding
}

/** Next unpaid due date across whichever table this debt uses. */
export function nextDueDate(
  debt: Debt,
  schedule: DebtScheduleRow[],
  statements: DebtStatement[],
): string | null {
  const rows: DueRow[] =
    debt.type === 'fixed' ? scheduleFor(schedule, debt.id) : statementsFor(statements, debt.id)
  return nextUnpaid(rows)?.due_date ?? null
}
```

- [ ] **Step 4: Verify and commit**

`npx tsc -b` still fails on files not yet migrated (`MockApi`, `seed`, `summary`, `Debts.tsx`). Confirm no errors originate in the two new lib files, then commit.

```bash
git add src/types.ts src/lib/debtSchedule.ts src/lib/debts.ts
git commit -m "feat: add debt schedule model and derived-value helpers"
```

---

### Task 3: API surface, adapters, seed, summary

**Files:**
- Modify: `src/api/FinanceApi.ts`, `src/api/mock/MockApi.ts`, `src/api/appsScript/AppsScriptApi.ts`, `src/api/mock/seed.ts`, `src/lib/summary.ts`, `src/hooks/useFinanceMutations.ts`

**Interfaces:**
- Consumes: types from Task 2, `Currency` from Task 1.
- Produces: `NewDebt`, `NewScheduleRow`, `NewStatement`, `ScheduleRowPatch`, `StatementPatch`, and the mutation objects `addDebt`, `updateDebt`, `deleteDebt`, `addScheduleRow`, `updateScheduleRow`, `deleteScheduleRow`, `addStatement`, `updateStatement`, `deleteStatement`, `setCurrency`.

- [ ] **Step 1: Rewrite the debt section of `src/api/FinanceApi.ts`**

Remove `NewDebtPayment` and the `DebtPayment` import. Replace `NewDebt`, and add:

```ts
export type NewScheduleRow = Omit<DebtScheduleRow, 'id' | 'debt_id'>
export type NewStatement = Omit<DebtStatement, 'id' | 'debt_id'>

/** A debt is created together with its initial rows, in one call. */
export type NewDebt =
  | { name: string; type: 'fixed'; rows: NewScheduleRow[] }
  | { name: string; type: 'revolving'; rows: NewStatement[] }

/** Patches never carry id or debt_id — a row cannot be renumbered or moved. */
export type ScheduleRowPatch = Partial<NewScheduleRow>
export type StatementPatch = Partial<NewStatement>
```

Replace the `addDebt`/`payDebt` members of the `FinanceApi` interface with:

```ts
  addDebt(input: NewDebt): Promise<Debt>
  updateDebt(id: number, patch: { name: string }): Promise<Debt>
  /** Deletes the debt and every row belonging to it. */
  deleteDebt(id: number): Promise<void>

  addScheduleRow(debtId: number, input: NewScheduleRow): Promise<DebtScheduleRow>
  updateScheduleRow(id: number, patch: ScheduleRowPatch): Promise<DebtScheduleRow>
  deleteScheduleRow(id: number): Promise<void>

  addStatement(debtId: number, input: NewStatement): Promise<DebtStatement>
  updateStatement(id: number, patch: StatementPatch): Promise<DebtStatement>
  deleteStatement(id: number): Promise<void>

  setCurrency(currency: Currency): Promise<void>
```

There is deliberately **no pay method** — paying is `updateScheduleRow(id, { paid: true, paid_date, paid_amount })`.

- [ ] **Step 2: Implement in `src/api/mock/MockApi.ts`**

Delete `addDebt`'s old body and `payDebt` entirely. Add:

```ts
  async addDebt(input: NewDebt): Promise<Debt> {
    const data = this.load()
    const debt: Debt = { id: nextId(data.debts), name: input.name, type: input.type }
    data.debts.push(debt)
    if (input.type === 'fixed') {
      for (const row of input.rows) {
        data.debt_schedule.push({ id: nextId(data.debt_schedule), debt_id: debt.id, ...row })
      }
    } else {
      for (const row of input.rows) {
        data.debt_statements.push({ id: nextId(data.debt_statements), debt_id: debt.id, ...row })
      }
    }
    this.save(data)
    return this.delay(debt)
  }

  async updateDebt(id: number, patch: { name: string }): Promise<Debt> {
    const data = this.load()
    const debt = data.debts.find((d) => d.id === id)
    if (!debt) throw new Error(`Debt ${id} not found`)
    debt.name = patch.name
    this.save(data)
    return this.delay(debt)
  }

  async deleteDebt(id: number): Promise<void> {
    const data = this.load()
    data.debts = data.debts.filter((d) => d.id !== id)
    data.debt_schedule = data.debt_schedule.filter((r) => r.debt_id !== id)
    data.debt_statements = data.debt_statements.filter((r) => r.debt_id !== id)
    this.save(data)
    return this.delay(undefined)
  }

  async addScheduleRow(debtId: number, input: NewScheduleRow): Promise<DebtScheduleRow> {
    const data = this.load()
    const row: DebtScheduleRow = { id: nextId(data.debt_schedule), debt_id: debtId, ...input }
    data.debt_schedule.push(row)
    this.save(data)
    return this.delay(row)
  }

  async updateScheduleRow(id: number, patch: ScheduleRowPatch): Promise<DebtScheduleRow> {
    const data = this.load()
    const row = data.debt_schedule.find((r) => r.id === id)
    if (!row) throw new Error(`Schedule row ${id} not found`)
    Object.assign(row, patch)
    this.save(data)
    return this.delay(row)
  }

  async deleteScheduleRow(id: number): Promise<void> {
    const data = this.load()
    data.debt_schedule = data.debt_schedule.filter((r) => r.id !== id)
    this.save(data)
    return this.delay(undefined)
  }
```

Add `addStatement`, `updateStatement`, `deleteStatement` following exactly the same shape against `data.debt_statements` with type `DebtStatement`. Then:

```ts
  async setCurrency(currency: Currency): Promise<void> {
    const data = this.load()
    data.settings.currency = currency
    this.save(data)
    return this.delay(undefined)
  }
```

Update the imports at the top of the file to match the types now used.

> **Note on `Object.assign(row, patch)`:** clearing a paid flag sends
> `{ paid: false, paid_date: undefined, paid_amount: undefined }`. Since the
> mock round-trips through `JSON.stringify`, `undefined` values drop out of the
> stored object, which is the desired result — the fields become absent.

- [ ] **Step 3: Implement in `src/api/appsScript/AppsScriptApi.ts`**

Every method is a one-line `this.call`. Remove `payDebt` and the `DebtPayment`/`NewDebtPayment` imports; add:

```ts
  addDebt(input: NewDebt): Promise<Debt> {
    return this.call<Debt>('addDebt', input)
  }

  updateDebt(id: number, patch: { name: string }): Promise<Debt> {
    return this.call<Debt>('updateDebt', { id, patch })
  }

  async deleteDebt(id: number): Promise<void> {
    await this.call<null>('deleteDebt', { id })
  }

  addScheduleRow(debtId: number, input: NewScheduleRow): Promise<DebtScheduleRow> {
    return this.call<DebtScheduleRow>('addScheduleRow', { debtId, input })
  }

  updateScheduleRow(id: number, patch: ScheduleRowPatch): Promise<DebtScheduleRow> {
    return this.call<DebtScheduleRow>('updateScheduleRow', { id, patch })
  }

  async deleteScheduleRow(id: number): Promise<void> {
    await this.call<null>('deleteScheduleRow', { id })
  }

  addStatement(debtId: number, input: NewStatement): Promise<DebtStatement> {
    return this.call<DebtStatement>('addStatement', { debtId, input })
  }

  updateStatement(id: number, patch: StatementPatch): Promise<DebtStatement> {
    return this.call<DebtStatement>('updateStatement', { id, patch })
  }

  async deleteStatement(id: number): Promise<void> {
    await this.call<null>('deleteStatement', { id })
  }

  async setCurrency(currency: Currency): Promise<void> {
    await this.call<null>('setCurrency', { currency })
  }
```

- [ ] **Step 4: Update the seed**

In `src/api/mock/seed.ts`, replace the `debts` and `debt_payments` entries and add `currency`:

```ts
    debts: [],
    debt_schedule: [],
    debt_statements: [],
```

and in `settings`:

```ts
    settings: {
      monthlyBudgets: { '2026-06': 900 },
      allowedEmails: ['ken.gagno@vibeteams.ai'],
      currency: 'PHP',
    },
```

> The mock persists to `localStorage['finance-mock-db']` and only seeds when that
> key is absent. An existing browser will still hold the old shape. Clear that
> key when testing, or the app will read `data.debt_schedule` as `undefined`.

- [ ] **Step 5: Recompute debt totals in `src/lib/summary.ts`**

`Dashboard` is unlinked but must still compile, and keeping this correct means it works when re-enabled. Replace the two debt lines:

```ts
  const totalDebt = data.debts.reduce(
    (acc, d) => acc + totalBalance(d, data.debt_schedule, data.debt_statements),
    0,
  )
  const debtPayments =
    sum(data.debt_schedule.filter((r) => r.paid).map((r) => r.paid_amount ?? r.amount)) +
    sum(data.debt_statements.filter((r) => r.paid).map((r) => r.paid_amount ?? r.min_due))
```

Add the import: `import { totalBalance } from './debts.ts'`.

- [ ] **Step 6: Update `src/hooks/useFinanceMutations.ts`**

Remove `addDebt`'s old typing and `payDebt`; add one `useMutation` per new API method, following the existing style. Example:

```ts
  const addDebt = useMutation({ mutationFn: (i: NewDebt) => getApi().addDebt(i), onSuccess })
  const updateDebt = useMutation({
    mutationFn: (v: { id: number; name: string }) => getApi().updateDebt(v.id, { name: v.name }),
    onSuccess,
  })
  const deleteDebt = useMutation({ mutationFn: (id: number) => getApi().deleteDebt(id), onSuccess })
  const addScheduleRow = useMutation({
    mutationFn: (v: { debtId: number; input: NewScheduleRow }) =>
      getApi().addScheduleRow(v.debtId, v.input),
    onSuccess,
  })
  const updateScheduleRow = useMutation({
    mutationFn: (v: { id: number; patch: ScheduleRowPatch }) =>
      getApi().updateScheduleRow(v.id, v.patch),
    onSuccess,
  })
  const deleteScheduleRow = useMutation({
    mutationFn: (id: number) => getApi().deleteScheduleRow(id),
    onSuccess,
  })
```

Mirror those three for statements, and add `setCurrency`. It needs its own
`onSuccess` rather than the shared one, because it also refreshes the
localStorage cache — the second callback argument is the value that was passed
to `mutate`:

```ts
  const setCurrency = useMutation({
    mutationFn: (c: Currency) => getApi().setCurrency(c),
    onSuccess: (_data, c) => {
      writeCachedCurrency(c)
      void qc.invalidateQueries({ queryKey: financeKey })
    },
  })
```

Export every new mutation from the returned object.

- [ ] **Step 7: Verify and commit**

`npx tsc -b` should now report errors **only** in `src/pages/Debts.tsx` (rebuilt in Task 7). Everything else must be clean.

```bash
git add src/api src/hooks/useFinanceMutations.ts src/lib/summary.ts
git commit -m "feat: rebuild debt API surface across both adapters"
```

---

### Task 4: Apps Script backend

**Files:**
- Modify: `apps-script/Code.gs`

- [ ] **Step 1: Update sheet definitions**

Read the existing sheet-name constants and header definitions. Remove `DebtPayments`. Change `Debts` headers to `id, name, type`. Add two sheets:

- `DebtSchedule` — `id, debt_id, due_date, amount, paid, paid_date, paid_amount`
- `DebtStatements` — `id, debt_id, due_date, min_due, total_due, outstanding, paid, paid_date, paid_amount`

Add `currency` to the Settings sheet handling, defaulting to `PHP` when the key is absent.

- [ ] **Step 2: Replace the debt actions**

Remove the `addDebt` and `payDebt` action handlers. Add handlers matching the payloads the client sends in Task 3 Step 3: `addDebt` (`{name, type, rows}` — insert the debt, then its rows with the new `debt_id`), `updateDebt` (`{id, patch}`), `deleteDebt` (`{id}` — delete the debt row *and* every row in both child sheets with that `debt_id`), `addScheduleRow` (`{debtId, input}`), `updateScheduleRow` (`{id, patch}`), `deleteScheduleRow` (`{id}`), the three statement equivalents, and `setCurrency` (`{currency}`).

Ensure `getAll` returns `debt_schedule` and `debt_statements` and no longer returns `debt_payments`.

- [ ] **Step 3: Update the setup guide**

In `docs/superpowers/guides/apps-script-setup.md`, update the sheet list to match. Note that an existing deployment needs the `Debts` sheet recreated and `DebtPayments` deleted — there is no migration, by design.

- [ ] **Step 4: Commit**

`Code.gs` is not part of the TypeScript build, so `tsc` does not cover it. Re-read the diff carefully instead.

```bash
git add apps-script/Code.gs docs/superpowers/guides/apps-script-setup.md
git commit -m "feat: restructure Apps Script sheets for the new debt model"
```

**→ Milestone M1 complete. Review the combined diff of Tasks 1–4 before continuing (risk-touching: money, data loss).**

---

### Task 5: Side navbar and routing

**Files:**
- Modify: `src/components/AppShell.tsx`, `src/App.tsx`

- [ ] **Step 1: Rewrite `AppShell.tsx`**

Two columns; sidebar off-canvas below `md`, controlled by local `open` state (set from event handlers, never from an effect).

```tsx
import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.ts'

const NAV_ITEMS = [
  { to: '/debts', label: 'Debts' },
  { to: '/settings', label: 'Settings' },
]

export function AppShell() {
  const { user, signOut } = useAuth()
  const [open, setOpen] = useState(false)

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-md px-3 py-2 text-sm font-medium ${
      isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
    }`

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile bar */}
      <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 md:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open navigation"
          className="rounded-md border border-slate-300 px-2 py-1 text-slate-600"
        >
          ☰
        </button>
        <span className="text-lg font-bold text-slate-900">Finance</span>
      </div>

      {open && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-10 bg-slate-900/40 md:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-20 flex w-56 flex-col border-r border-slate-200 bg-white transition-transform md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="px-4 py-4 text-lg font-bold text-slate-900">Finance</div>
        <nav className="flex flex-1 flex-col gap-1 px-2">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={linkClass}
              onClick={() => setOpen(false)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-200 px-4 py-3 text-sm text-slate-600">
          <div className="truncate">{user?.name}</div>
          <button
            type="button"
            onClick={signOut}
            className="mt-2 rounded-md border border-slate-300 px-2 py-1 hover:bg-slate-100"
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="px-4 py-6 md:ml-56">
        <div className="mx-auto max-w-5xl">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Rewrite the routes in `src/App.tsx`**

Remove the `Dashboard`, `Funds`, `Bills`, `Expendable`, and `Savings` imports. Add `Navigate`:

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Debts } from './pages/Debts.tsx'
import { DebtDetail } from './pages/DebtDetail.tsx'
import { Settings } from './pages/Settings.tsx'
```

```tsx
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/debts" replace />} />
        <Route path="debts" element={<Debts />} />
        <Route path="debts/:id" element={<DebtDetail />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/debts" replace />} />
      </Route>
    </Routes>
```

`DebtDetail` and `Settings` do not exist yet — this task will not compile alone. Create **both** files as placeholders now; Task 6 fills in `Settings` and Task 8 fills in `DebtDetail`.

`src/pages/Settings.tsx`:

```tsx
export function Settings() {
  return null
}
```

`src/pages/DebtDetail.tsx`:

```tsx
export function DebtDetail() {
  return null
}
```

- [ ] **Step 3: Verify and commit**

```bash
npx tsc -b   # errors expected only in Debts.tsx
git add src/components/AppShell.tsx src/App.tsx src/pages/Settings.tsx src/pages/DebtDetail.tsx
git commit -m "feat: replace top nav with side navbar and trim routes"
```

---

### Task 6: Settings page

**Files:**
- Modify: `src/pages/Settings.tsx`

- [ ] **Step 1: Implement the currency selector**

```tsx
import { useFinanceData } from '../hooks/useFinanceData.ts'
import { useFinanceMutations } from '../hooks/useFinanceMutations.ts'
import { useCurrency } from '../hooks/useCurrency.ts'
import { CURRENCY_LABELS } from '../lib/currency.ts'
import { Card } from '../components/Card.tsx'
import type { Currency } from '../types.ts'

const OPTIONS: Currency[] = ['PHP', 'USD']

export function Settings() {
  const { isLoading } = useFinanceData()
  const { setCurrency } = useFinanceMutations()
  const currency = useCurrency()

  if (isLoading) return <p className="text-slate-500">Loading…</p>

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Settings</h1>
      <Card title="Currency">
        <div className="flex flex-col gap-2">
          {OPTIONS.map((c) => (
            <label key={c} className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="radio"
                name="currency"
                value={c}
                checked={currency === c}
                disabled={setCurrency.isPending}
                onChange={() => setCurrency.mutate(c)}
              />
              {CURRENCY_LABELS[c]}
            </label>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Changes the displayed symbol only — amounts are not converted.
        </p>
        {setCurrency.isError && (
          <p className="mt-2 text-sm text-red-600">Could not save. Please try again.</p>
        )}
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Verify and commit**

```bash
npx tsc -b && npm run lint
git add src/pages/Settings.tsx
git commit -m "feat: add settings page with currency selector"
```

**→ Milestone M2 complete.**

---

### Task 7: Debts index and Add Debt

**Files:**
- Create: `src/components/Modal.tsx`, `src/components/DueBadge.tsx`, `src/pages/debts/AddDebtModal.tsx`
- Modify: `src/pages/Debts.tsx`

**Interfaces:**
- Produces: `<Modal open title onClose>`, `<DueBadge dueDate>`, `<AddDebtModal open onClose>`.

- [ ] **Step 1: Create `src/components/Modal.tsx`**

```tsx
import type { ReactNode } from 'react'

export function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40"
      />
      <div className="relative z-10 w-full max-w-md rounded-xl border border-slate-200 bg-white p-4 shadow-lg">
        <h2 className="mb-3 text-base font-semibold text-slate-900">{title}</h2>
        {children}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `src/components/DueBadge.tsx`**

```tsx
import { dueStatus, DUE_STATUS_LABEL, DUE_STATUS_CLASS } from '../lib/debts.ts'

export function DueBadge({ dueDate }: { dueDate: string | null }) {
  if (!dueDate) return <span className="text-slate-400">—</span>
  const status = dueStatus(dueDate)
  return (
    <span className="inline-flex items-center gap-2">
      <span className="tabular-nums">{dueDate}</span>
      <span
        className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${DUE_STATUS_CLASS[status]}`}
      >
        {DUE_STATUS_LABEL[status]}
      </span>
    </span>
  )
}
```

- [ ] **Step 3: Create `src/pages/debts/AddDebtModal.tsx`**

Name and Type first; Type reveals the rest. The fixed branch shows a live row preview computed with `buildSchedule`, wrapped in try/catch so invalid input shows a message rather than throwing during render.

Fixed fields: `First due date` (date), `Total balance` (number), `Number of months` (number).
Revolving fields: `Payment due date` (date), `Minimum amount due`, `Total amount due`, `Outstanding balance`.

On submit, build the `NewDebt` payload:

```ts
// fixed
addDebt.mutate({ name, type: 'fixed', rows: buildSchedule(firstDue, Number(total), Number(months)) })

// revolving
addDebt.mutate({
  name,
  type: 'revolving',
  rows: [{
    due_date: dueDate,
    min_due: Number(minDue),
    total_due: Number(totalDue),
    outstanding: Number(outstanding),
    paid: false,
  }],
})
```

Close on success via the mutate `onSuccess` callback; render `addDebt.isError` inline as "Could not add debt. Please try again."

- [ ] **Step 4: Rewrite `src/pages/Debts.tsx`**

Header with title and `[+ Add Debt]`; a `Table` with headers `['Name', 'Next Due', 'Total Balance']`. Each row is clickable via `useNavigate` to `/debts/${d.id}`, with the name also rendered as a `Link` so keyboard and screen-reader users get a real link target.

```tsx
const next = nextDueDate(d, data.debt_schedule, data.debt_statements)
const balance = totalBalance(d, data.debt_schedule, data.debt_statements)
```

Empty state when `data.debts.length === 0`: "No debts yet." plus the Add Debt button.

- [ ] **Step 5: Verify and commit**

```bash
npx tsc -b && npm run lint && npm run build
git add src/components/Modal.tsx src/components/DueBadge.tsx src/pages/debts src/pages/Debts.tsx
git commit -m "feat: rebuild debts index with add-debt modal"
```

---

### Task 8: Debt detail with pay, edit, delete

**Files:**
- Create: `src/components/ConfirmDialog.tsx`, `src/pages/debts/PayModal.tsx`, `src/pages/debts/RowFormModal.tsx`
- Modify: `src/pages/DebtDetail.tsx`

- [ ] **Step 1: Create `src/components/ConfirmDialog.tsx`**

Wraps `Modal`; takes `message`, `confirmLabel`, `onConfirm`, `onClose`, and a `pending` flag. The confirm button is red (`bg-red-600 hover:bg-red-700`) since every use is destructive.

- [ ] **Step 2: Create `src/pages/debts/PayModal.tsx`**

Fields: `Payment date` (date, defaults to `isoDate()`) and `Amount paid` (number). The caller supplies `defaultAmount` — the row's `amount` for fixed, `min_due` for revolving.

```ts
onSubmit({ paid: true, paid_date: date, paid_amount: Number(amount) })
```

- [ ] **Step 3: Create `src/pages/debts/RowFormModal.tsx`**

One component serving add and edit, for both row kinds, driven by a `kind: 'schedule' | 'statement'` prop.

- `schedule`: `Due date`, `Amount`, plus a `Paid` checkbox that reveals `Paid date` and `Paid amount`.
- `statement`: `Payment due date`, `Minimum amount due`, `Total amount due`, `Outstanding balance`, plus the same paid group.

Unchecking `Paid` submits `{ paid: false, paid_date: undefined, paid_amount: undefined }` — this is how a mistaken payment is undone.

- [ ] **Step 4: Implement `src/pages/DebtDetail.tsx`**

```tsx
const { id } = useParams()
const debtId = Number(id)
const debt = data.debts.find((d) => d.id === debtId)
if (!debt) return <p className="text-slate-500">Debt not found. <Link to="/debts">Back to debts</Link></p>
```

Header: back link, name, type badge, `[Edit]` and `[Delete]`. Summary line with `totalBalance` and `nextDueDate` via `<DueBadge>`.

Fixed table headers: `['Due Date', 'Amount', 'Status', '']`.
Revolving headers: `['Due Date', 'Min Due', 'Total Due', 'Outstanding', 'Status', '']`.

Status cell: `Paid {paid_date}` when paid, otherwise `<DueBadge>`'s label. Actions cell: `[Pay]` (hidden or `disabled` when `row.paid`), `[Edit]`, `[Delete]`.

Below the table, `[+ Add row]` for fixed or `[+ Add statement]` for revolving.

Delete-debt confirmation message must state the row count:

```ts
`Delete ${debt.name} and its ${rows.length} ${debt.type === 'fixed' ? 'schedule rows' : 'statements'}?`
```

On successful debt delete, `navigate('/debts')`.

Surface `isError` from each mutation inline near the affected control.

- [ ] **Step 5: Verify and commit**

```bash
npx tsc -b && npm run lint && npm run build
git add src/components/ConfirmDialog.tsx src/pages/debts src/pages/DebtDetail.tsx
git commit -m "feat: add debt detail view with pay, edit, and delete"
```

**→ Milestone M3 complete. Review the combined diff of Tasks 5–8 (risk-touching: money).**

---

## Final verification

- [ ] `npx tsc -b` — clean
- [ ] `npm run lint` — clean
- [ ] `npm run build` — succeeds
- [ ] Manual pass in mock mode (clear `localStorage['finance-mock-db']` first):
  1. Add a fixed debt: 150240 over 24 months from 2026-03-27 → 24 rows of ₱6,260.00.
  2. Add a revolving debt with one statement.
  3. Pay a row → button disables, balance drops.
  4. Edit a paid row, uncheck Paid → row returns to unpaid, balance rises.
  5. Add a second statement to the revolving debt → balance follows the latest.
  6. Delete a debt → confirmation names the row count; rows disappear with it.
  7. Switch currency in Settings → every amount changes symbol, no reload.
  8. Visit `/funds` → redirects to `/debts`.
  9. Narrow to phone width → sidebar collapses behind the hamburger.
