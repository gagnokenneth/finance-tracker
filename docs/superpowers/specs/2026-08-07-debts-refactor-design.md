# Debts Refactor, Side Navigation, and Settings — Design

Date: 2026-08-07

## Overview

Five related changes, shipped together:

1. Replace the top navbar with a side navbar.
2. Show only Debts and Settings; unregister the other routes.
3. Add a Settings module with a currency selector (PHP / USD).
4. Rebuild the Debts module around per-debt schedule rows.
5. Support two debt types — fixed (known end date) and revolving (open-ended).

The debt model is driven by a reference spreadsheet the user maintains today:
one sheet per debt, rows of installments for fixed debts and rows of statements
for revolving ones. Its totals row sums only the *unpaid* rows, which is why
"total balance" means remaining balance throughout this document.

## Decisions

| Question | Decision |
|---|---|
| Fixed debt input | Total balance ÷ number of months; last row absorbs the rounding remainder |
| Revolving rows | Added manually via "Add statement"; nothing auto-generated |
| Pay action | Prompts for payment date and amount paid |
| Hidden modules | Nav links removed **and** routes unregistered; page files stay on disk |
| Currency storage | Backend Settings sheet is source of truth, localStorage caches it |
| Existing debt data | Clean break — old shape removed, no migration, mock seeds empty |
| Row storage | Two flat sibling tables (not nested, not one unified table) |
| Detail view | Its own route, `/debts/:id` |
| Edit / delete | Full row-level: debts and individual rows can be edited and deleted |

## Section 1 — Navigation

`AppShell.tsx` becomes a two-column layout.

```
┌────────────┬──────────────────────────────────────┐
│  Finance   │                                      │
│            │   Debts                              │
│  ▸ Debts   │                        [+ Add Debt]  │
│  ▸ Settings│   ┌────────────────────────────────┐ │
│            │   │ Name  Next Due  Total Balance  │ │
│            │   └────────────────────────────────┘ │
│  ──────────│                                      │
│  Ken G.    │                                      │
│  Sign out  │                                      │
└────────────┴──────────────────────────────────────┘
```

- Fixed left sidebar, `w-56`, white with a right border, keeping the existing
  light slate palette.
- Nav items come from one `NAV_ITEMS` array (`Debts`, `Settings`). The active
  item gets a filled background rather than the old bottom-border treatment,
  which reads better vertically.
- User name and Sign out move to a sidebar footer pinned to the bottom.
- Below the `md` breakpoint the sidebar is off-canvas, opened by a hamburger in
  a slim top bar. This is required, not optional — a fixed sidebar consumes half
  a phone screen.

### Routing

`App.tsx` registers only:

| Path | Element |
|---|---|
| `/debts` | `Debts` (index) |
| `/debts/:id` | `DebtDetail` |
| `/settings` | `Settings` |
| `/` | redirect to `/debts` |
| `*` | redirect to `/debts` |

`Dashboard.tsx`, `Funds.tsx`, `Bills.tsx`, `Savings.tsx`, and `Expendable.tsx`
remain on disk but are no longer imported.

Because `Debt` and `DebtPayment` are being removed from `types.ts`,
`Dashboard.tsx` will no longer compile — it reads debt totals. Its debt
references are deleted as part of this work so the repository still typechecks
clean. No other unlinked page references the debt types.

## Section 2 — Settings and currency

New `src/pages/Settings.tsx`: one card with a two-option currency radio,
**₱ Philippine Peso (PHP)** and **$ US Dollar (USD)**.

### Model

`Settings` gains `currency: Currency` where `type Currency = 'PHP' | 'USD'`,
defaulting to `PHP`.

### Read path

Backend is the source of truth; localStorage is a cache that prevents a
first-paint flicker of the wrong symbol.

```
render → currency = data?.settings.currency ?? localStorage ?? 'PHP'
```

This is a **derived value, not state**. No `setState` runs inside an effect —
commit `8f059fa` shows that lint rule has already bitten this project once. A
small effect writes the resolved value back to localStorage under
`finance.currency`; writing to storage is a side effect the rule permits.

### Write path

The `setCurrency` mutation writes the Settings sheet, then updates localStorage
on success.

### Formatting

`src/lib/money.ts` currently closes over a module-level `Intl.NumberFormat`
hardcoded to USD. It becomes `formatMoney(amount, currency)` backed by a small
memo cache of formatters. `<Money>` reads the active currency from a
`useCurrency()` hook, so no call site passes it explicitly.

**Switching currency changes the symbol and grouping only. There is no
conversion.** A debt entered as 6,260 renders as ₱6,260.00 or $6,260.00 — the
same number.

## Section 3 — Debt data model and API

### Types

`DebtType` changes meaning: `'straight' | 'installment'` becomes
`'fixed' | 'revolving'`. `Debt` slims to identity only; money lives in the rows.

```ts
export type DebtType = 'fixed' | 'revolving'

export interface Debt {
  id: number
  name: string
  type: DebtType
}

export interface DebtScheduleRow {        // fixed
  id: number
  debt_id: number
  due_date: string                        // ISO yyyy-mm-dd
  amount: number
  paid: boolean
  paid_date?: string
  paid_amount?: number
}

export interface DebtStatement {          // revolving
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

`FinanceData` gains `debt_schedule: DebtScheduleRow[]` and
`debt_statements: DebtStatement[]`. `debt_payments` and the `DebtPayment` type
are deleted.

Two flat sibling tables rather than one table with a discriminator: each type
carries exactly the columns it has, with no permanently-empty cells and no
narrowing helper needed to read a field safely. Both map one-to-one onto Google
Sheets tabs, which keeps the sheet human-readable — the user reads this
spreadsheet directly, so that is a real requirement.

### Input types

Inputs omit server-assigned fields, following the existing `NewFund` /
`NewBill` convention in `FinanceApi.ts`.

```ts
export type NewScheduleRow = Omit<DebtScheduleRow, 'id' | 'debt_id'>
export type NewStatement   = Omit<DebtStatement,  'id' | 'debt_id'>

// A debt is created together with its initial rows, in one call.
export type NewDebt =
  | { name: string; type: 'fixed';     rows: NewScheduleRow[] }
  | { name: string; type: 'revolving'; rows: NewStatement[] }
```

`addScheduleRow` and `addStatement` take the `debt_id` separately, since those
add a row to a debt that already exists.

Patches never include `id` or `debt_id` — a row cannot be renumbered or moved to
another debt:

```ts
export type ScheduleRowPatch = Partial<NewScheduleRow>
export type StatementPatch   = Partial<NewStatement>
```

### Schedule generation

Generation happens in the **frontend**, not in the API adapters. If `addDebt`
generated rows server-side, the logic would exist twice — once in `MockApi`
(TypeScript) and once in `Code.gs` (Apps Script, separate runtime, no shared
imports). Instead a pure module builds the rows and `addDebt` persists what it
is handed.

```ts
// src/lib/debtSchedule.ts
buildSchedule(firstDueDate: string, total: number, months: number): NewScheduleRow[]
```

Two behaviours it must get right:

- **Month stepping clamps to end-of-month.** A January 31 start yields
  February 28 (or 29), not March 3.
- **Rounding puts the remainder on the last row.** 1,000 over 3 months gives
  333.33 / 333.33 / 333.34, summing exactly to the total.

### API surface

`FinanceApi` replaces `addDebt` and `payDebt` with:

```ts
addDebt(input: NewDebt): Promise<Debt>       // carries its generated rows
updateDebt(id: number, patch: { name: string }): Promise<Debt>
deleteDebt(id: number): Promise<void>        // cascades to rows

addScheduleRow(debtId: number, input: NewScheduleRow): Promise<DebtScheduleRow>
updateScheduleRow(id: number, patch: ScheduleRowPatch): Promise<DebtScheduleRow>
deleteScheduleRow(id: number): Promise<void>

addStatement(debtId: number, input: NewStatement): Promise<DebtStatement>
updateStatement(id: number, patch: StatementPatch): Promise<DebtStatement>
deleteStatement(id: number): Promise<void>

setCurrency(c: Currency): Promise<void>
```

There is no dedicated pay method. Paying is
`updateScheduleRow(id, { paid: true, paid_date, paid_amount })` — a separate
method would be a second way to perform the same write in two adapters.

`updateDebt` accepts the name only. Type is locked after creation, because
changing it would invalidate every existing row; wrong amounts are corrected by
editing rows directly.

### Derived values

Pure functions in `src/lib/debts.ts`, not inline in components:

- `nextUnpaid(rows)` — earliest unpaid row by due date; the index's "next
  payment due date".
- `totalBalance(debt, rows)` — for **fixed**, the sum of unpaid amounts. For
  **revolving**, the `outstanding` of the most recent statement by due date,
  because a card balance is not a sum of statements.
- `dueStatus(dueDate, today)` — `'late' | 'due-soon' | 'upcoming'`.

### Apps Script

`Code.gs` restructures the `Debts` sheet and replaces `DebtPayments` with two
new tabs, `DebtSchedule` and `DebtStatements`. Since the model starts empty this
is a recreate, not a migration.

## Section 4 — Debts index

```
Debts                                        [+ Add Debt]
┌──────────────────┬───────────────┬──────────────────┐
│ Name             │ Next Due      │ Total Balance    │
├──────────────────┼───────────────┼──────────────────┤
│ Honda Giorno+    │ 2026-08-27  ● │       ₱118,940.00│
│ BDO Gold Card    │ 2026-08-24  ● │       ₱104,190.42│
│ BPI Gold Rewards │ —             │             ₱0.00│
└──────────────────┴───────────────┴──────────────────┘
```

Three columns. The whole row links to the detail view.

**Next Due** is the earliest unpaid row, coloured by `dueStatus`:

| State | Condition | Colour |
|---|---|---|
| Late | due date before today | red |
| Due soon | today through +7 days | amber |
| Upcoming | more than 7 days out | slate |
| Settled | no unpaid rows | `—`, muted |

Every colour is paired with a text label. Colour is never the only signal.

A debt with no rows renders `—` and a zero balance rather than failing; the
reference spreadsheet contains exactly such a debt. A separate empty state
covers having no debts at all, which is how the mock now seeds.

**Add Debt** opens a modal. Name and Type come first; choosing Type reveals the
remaining fields.

| Fixed | Revolving |
|---|---|
| First due date | Payment due date |
| Total balance | Minimum amount due |
| Number of months | Total amount due |
| | Outstanding balance |

The fixed form shows a live preview — "24 rows @ ₱6,260.00" — before saving, so
a mistyped total is visible immediately.

## Section 5 — Debt detail

Route `/debts/:id`. The header carries the name, a type badge, and Edit and
Delete actions; a summary line shows total balance and next due date.

```
← Debts

Honda Giorno+   [fixed]              [Edit] [Delete]
Total balance ₱118,940.00 · Next due 2026-08-27

┌────────────┬──────────┬──────────────────────┬─────────────────┐
│ Due Date   │ Amount   │ Status               │                 │
├────────────┼──────────┼──────────────────────┼─────────────────┤
│ 2026-03-27 │ ₱6,260.00│ Paid 2026-03-25      │ [Edit] [Delete] │
│ 2026-08-27 │ ₱6,260.00│ Due soon             │ [Pay][Edit][Del]│
│ 2026-09-27 │ ₱6,260.00│ Upcoming             │ [Pay][Edit][Del]│
└────────────┴──────────┴──────────────────────┴─────────────────┘
                                                      [+ Add row]
```

Revolving debts use the same layout with the four statement columns — Payment
Due Date, Minimum Amount Due, Total Amount Due, Outstanding Balance — and an
`[+ Add statement]` action.

**Pay** opens a dialog with payment date (defaulting to today) and amount paid,
prefilled with the row's scheduled amount for fixed debts and the minimum due
for revolving ones. On save the row shows `Paid <date>` and its Pay button
becomes disabled.

**Edit** and **Delete** remain available on paid rows. Editing a row can clear
its paid flag, which is how a mistaken payment is undone.

**Delete** always confirms. Deleting a debt states how many rows go with it —
"Delete Honda Giorno+ and its 24 schedule rows?" — because that action cannot
be undone.

## Section 6 — Error handling and verification

Mutation failures surface inline on the form or row that caused them, never
silently. A failed Pay leaves the row unpaid and shows the reason. All deletes
confirm first. React Query invalidates the single `financeKey` on every success,
following the existing pattern.

This project keeps no automated tests. Verification is:

```
npx tsc -b
npm run lint
npm run build
```

plus a manual pass in mock mode:

1. Create one fixed debt and one revolving debt.
2. Pay a row; confirm the button disables and the balance drops.
3. Edit a row; confirm the paid flag can be cleared.
4. Delete a debt; confirm its rows go with it.
5. Switch currency; confirm every amount changes symbol without a reload.
6. Visit `/funds` directly; confirm it redirects to `/debts`.

Node 20.19+ or 22.12+ is required for the Vite 8 dev server; `.nvmrc` pins 24.

## Out of scope

- Currency conversion — the setting changes the displayed symbol only.
- Reinstating Dashboard, Funds, Bills, Savings, or Expendable.
- Date-only placeholder statements. The reference spreadsheet contains one, but
  supporting it would require nullable amounts plus a fill-in-later flow.
  Statements are added when they arrive, with their numbers.
- Interest rate tracking. The old model had an `interest_rate` field; nothing in
  the new design uses it and it is removed.
- Importing the reference spreadsheet. It informed this design; its data is not
  loaded.
