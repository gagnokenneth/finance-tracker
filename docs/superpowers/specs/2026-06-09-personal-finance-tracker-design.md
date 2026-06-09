# Personal Finance Tracker — Design

**Date:** 2026-06-09
**Status:** Approved (design phase)

## Overview

A private, single-user personal finance tracker. React + Vite + TypeScript
frontend styled exclusively with Tailwind utility classes. Data lives in Google
Sheets, fronted by a Google Apps Script web app that acts as the API. Access is
protected by real Google Sign-In with an email whitelist verified server-side.

All balance/summary math is computed on the frontend; Sheets is storage only.

## Decisions (locked during brainstorming)

- **Backend strategy:** Build the full frontend against a typed API interface
  with two adapters — a local **mock** adapter (seeded localStorage data) for
  development/testing, and a **live** Apps Script adapter. A config flag selects
  which. The Apps Script code + a deploy guide are delivered for the user to
  deploy; the user creates the Sheet and deploys the web app.
- **Auth:** Real Google Sign-In (Google Identity Services). ID token (JWT) sent
  with every request; Apps Script verifies the token and checks the email
  against a whitelist in the `settings` sheet.
- **Navigation:** Top tab bar with React Router routes per module.
- **Remaining Balance formula:** subtracts Savings (the Summary-section
  definition is canonical).
- **Hosting:** GitHub Pages (repo `gagnokenneth/expense`). Switchable to Netlify.
- **Data layer:** TanStack Query over a swappable typed API client.

## Tech Stack

| Concern | Choice |
|---|---|
| Frontend | React 19 + Vite + TypeScript (existing scaffold) |
| Styling | Tailwind CSS — utility classes only, no custom CSS files |
| Routing | `react-router-dom` |
| Server state | `@tanstack/react-query` |
| Auth | Google Identity Services (frontend) + JWT verify in Apps Script |
| Backend/DB | Google Sheets (one sheet per module) |
| API | Google Apps Script web app (`doGet`/`doPost`) |
| Testing | Vitest + React Testing Library |
| Hosting | GitHub Pages |

The existing starter files (`src/App.css`, `src/index.css` custom styles, the
demo `src/App.tsx`, demo assets) are removed/replaced.

## Architecture

### API layer — one interface, two adapters

```
FinanceApi (TypeScript interface)
 ├── MockApi       → seeded data in localStorage, simulated latency, stubbed auth
 └── AppsScriptApi → fetch() to deployed web app URL, attaches Google ID token
```

- Selected by `VITE_API_MODE` (`mock` | `live`) plus `VITE_APPS_SCRIPT_URL`.
- Every screen and computation works identically against both adapters.
- The interface exposes per-sheet CRUD plus the cross-module actions (mark bill
  paid, record debt payment, add savings, transfer savings back to funds).

### Apps Script backend (delivered as code + deploy guide)

- Single action-based router. Reads: `doGet` with
  `?action=list&sheet=<name>`. Writes: `doPost` with a JSON body
  (`{action, sheet, payload}`) covering create/update.
- Every request verifies the Google ID token (JWT) and checks the email against
  the whitelist in `settings`. Unauthorized → error response.
- Auto-increment `id` per sheet; date stored as ISO strings.
- Delivered artifacts: the `.gs` source, the sheet/column setup, and a
  step-by-step deploy guide under `docs/`.

### Frontend structure

- Top tab bar: Dashboard · Funds · Bills · Expendable · Debts · Savings.
- Routes: `/` (Dashboard), `/funds`, `/bills`, `/expendable`, `/debts`,
  `/savings`. GitHub Pages `base` configured + SPA redirect shim for deep links.
- Route guard blocks all pages until signed in (stubbed in `mock` mode).
- Each module: a list view + add/edit form matching its column spec.
- Mutations invalidate the relevant TanStack Query caches so derived totals and
  the dashboard update everywhere.

### Money math — single tested module

`computeSummary(data)` is the one source of truth, unit-tested against the
spec's worked formulas:

- **Total Funds** = Σ `funds.amount`
- **Total Bills** = Σ `bills.amount`
- **Bills Paid** = Σ `bills.amount` where `paid = true`
- **Monthly Expendable** = current-month budget from `settings`
- **Spent This Month** = Σ `expendable.daily_amount` for the current month
- **Remaining Expendable** = Monthly Expendable − Spent This Month
- **Total Debt** = Σ `debts.remaining`
- **Savings Total** = Σ `savings.amount` − Σ `savings_transfers.amount`
- **Remaining Balance** = Total Funds − Bills Paid − Monthly Expendable
  − Σ `debt_payments.amount` − Savings Total

## Modules & Sheets

### funds
Columns: `id` (auto), `source` (text), `amount` (number), `date` (date),
`notes` (text, optional).

### bills
Columns: `id` (auto), `name` (text), `amount` (number), `due_date` (date),
`paid` (boolean, default false), `notes` (text, optional).
- Checkbox per bill; toggling writes to Sheets and updates balance.

### expendable
Columns: `id` (auto), `month` (text, e.g. `2026-06`), `daily_amount` (number),
`date` (date), `notes` (text, optional).
- Monthly budget stored in `settings`. Daily entries logged under the month.

### debts
Columns: `id` (auto), `name` (text), `total_amount` (number),
`remaining` (number), `type` (`straight` | `installment`),
`interest_rate` (number), `notes` (text, optional).

### debt_payments
Columns: `id` (auto), `debt_id` (ref → debts), `amount_paid` (number),
`date` (date), `notes` (text, optional).
- Select a debt from a dropdown, enter payment → `debts.remaining` reduced by the
  payment; payment also reduces Remaining Balance.
- Interest: `installment` adds interest to remaining per cycle; `straight` is
  due in full at once. (Interest handling implemented per spec; cycle accrual
  applied on payment/record.)

### savings
Columns: `id` (auto), `date` (date), `amount` (number),
`source` (`funds` | `remaining_expendable`), `total` (number, computed),
`notes` (text, optional).
- Saving from `funds` → deducts from Remaining Balance, adds to Savings Total.
- Saving from `remaining_expendable` → deducts from Remaining Expendable, adds to
  Savings Total.
- Source dropdown shown when adding an entry.

### savings_transfers
Columns: `id` (auto), `date` (date), `amount` (number), `notes` (text, optional).
- Transfer back to Funds → creates a new `funds` entry with `source = Savings`
  and reduces Savings Total.

### settings
Holds the monthly expendable budget (per month) and the allowed-users whitelist
(your Google email).

### Dashboard (Summary)
Displays Total Funds, Total Bills, Bills Paid, Monthly Expendable, Spent This
Month, Total Debt, Savings Total, and Remaining Balance — all via
`computeSummary`.

## Auth Flow

1. User opens the app → route guard requires sign-in.
2. Google Sign-In button → Google returns an ID token (JWT).
3. Token stored in `localStorage`; attached to every API request.
4. Apps Script verifies the token and checks the email against the `settings`
   whitelist.
5. Token expiry (~1h) → re-prompt sign-in.
6. In `mock` mode, auth is stubbed so dev/testing needs no Google account.

## Error Handling

- API errors surface as inline, non-blocking error states per view (with retry).
- Auth/whitelist failures route the user back to the sign-in screen with a clear
  message.
- Mutations use optimistic updates with rollback on failure via TanStack Query.

## Testing

- **Unit:** `computeSummary` exhaustively, against the spec's formulas and edge
  cases (empty data, partial months, mixed debt types).
- **Component/integration:** React Testing Library over the mock adapter — no
  network required. Cover the cross-module actions (bill paid, debt payment,
  savings add, transfer-back).

## Deployment

- GitHub Pages: Vite `base` set to the repo path, SPA redirect shim for client
  routing, build + publish workflow.
- Switchable to Netlify later (no SPA shim needed there).

## Out of Scope (YAGNI)

- Multi-user / shared accounts (single-user only).
- Editing historical computed `total` columns by hand.
- Recurring-bill automation, notifications, currency conversion.
