# Finance Tracker — Backend, Auth & Deploy Implementation Plan (Plan 3 of 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **No automated tests:** Per project preference, this plan creates NO test files. Verify with `npx tsc -b` and `npm run build` (mock-mode build). The Apps Script backend and CI workflow are not compiled locally — they are delivered as code + a deploy guide.

**Goal:** Connect the app to a real Google Sheets backend via a Google Apps Script web app, add real Google Sign-In with server-side token verification + email whitelist, deploy to GitHub Pages, and fix the savings transfer-back balance double-count.

**Architecture:** A new `AppsScriptApi` implements the existing `FinanceApi` by POSTing actions (with the Google ID token) to the deployed web app; the adapter selector picks it when `VITE_API_MODE=live`. The `MockApi` path is untouched, so dev/testing still works offline with a stubbed auth. Real auth uses Google Identity Services (GIS): the ID token is stored in `localStorage`, decoded client-side for display, verified server-side in Apps Script against the OAuth client ID and the `settings` whitelist. GitHub Actions builds in live mode and publishes to Pages.

**Tech Stack:** React 19, TypeScript 6 (`verbatimModuleSyntax` → `import type`; `.ts`/`.tsx` extensions), Vite 8, Tailwind v4, `@tanstack/react-query`, `react-router-dom`, Google Identity Services, Google Apps Script, GitHub Actions + Pages.

Reference spec: `docs/superpowers/specs/2026-06-09-personal-finance-tracker-design.md`
Builds on Plans 1 & 2 (merged).

---

## Savings balance fix (decided)

The spec's transfer-back creates a `funds` entry labeled "Savings" **and** reduces Savings Total, which double-credits Remaining Balance. Decision: **keep the fund entry for the record, but exclude `source === 'Savings'` fund entries from the balance** (Total Funds metric stays inclusive). Implemented in Task 1.

---

## File Structure (this plan)

```
src/
  lib/summary.ts               # MODIFY: exclude source==='Savings' funds from balance
  env.d.ts                     # MODIFY: add VITE_GOOGLE_CLIENT_ID
  auth/
    token.ts                   # CREATE: id-token storage + expiry event
    googleJwt.ts               # CREATE: client-side JWT decode (display only)
    google.d.ts                # CREATE: GIS window typing
    AuthContext.tsx            # MODIFY: mock stub + live GIS
  api/
    appsScript/AppsScriptApi.ts# CREATE: live adapter + AuthError
    index.ts                   # MODIFY: select AppsScriptApi in live mode
  pages/SignIn.tsx             # MODIFY: GIS button in live mode
  App.tsx                      # MODIFY: router basename for Pages
vite.config.ts                 # MODIFY: base path for Pages build
.env.example                   # CREATE
.github/workflows/deploy.yml   # CREATE: build (live) + deploy to Pages
apps-script/Code.gs            # CREATE: the backend
docs/superpowers/guides/apps-script-setup.md  # CREATE: deploy guide
```

---

## Task 1: Fix savings double-count in the balance

**Files:**
- Modify: `src/lib/summary.ts`

- [ ] **Step 1: Update `computeSummary`**

In `src/lib/summary.ts`, replace the `remainingBalance` computation block. Find:

```ts
  const totalDebt = sum(data.debts.map((d) => d.remaining))
  const debtPayments = sum(data.debt_payments.map((p) => p.amount_paid))
  const savingsTotal =
    sum(data.savings.map((s) => s.amount)) -
    sum(data.savings_transfers.map((t) => t.amount))
  const remainingBalance =
    totalFunds - billsPaid - monthlyExpendable - debtPayments - savingsTotal
```

Replace with:

```ts
  const totalDebt = sum(data.debts.map((d) => d.remaining))
  const debtPayments = sum(data.debt_payments.map((p) => p.amount_paid))
  const savingsTotal =
    sum(data.savings.map((s) => s.amount)) -
    sum(data.savings_transfers.map((t) => t.amount))
  // Funds entries created by a savings transfer-back are recorded for history
  // but must NOT re-credit the balance — the reduced savingsTotal already does.
  const savingsReturnedToFunds = sum(
    data.funds.filter((f) => f.source === 'Savings').map((f) => f.amount),
  )
  const remainingBalance =
    totalFunds -
    savingsReturnedToFunds -
    billsPaid -
    monthlyExpendable -
    debtPayments -
    savingsTotal
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc -b`
Expected: no errors.

> Manual sanity (not a test): with seed data there are no `source: 'Savings'` funds, so the Dashboard still shows Remaining Balance **$2,500.00**. After a save-$X-then-transfer-$X-back cycle, the balance returns to its pre-save value instead of being $X too high.

- [ ] **Step 3: Commit**

```bash
git add src/lib/summary.ts
git commit -m "fix: exclude returned-savings funds from remaining balance"
```

---

## Task 2: Env typing and example

**Files:**
- Modify: `src/env.d.ts`
- Create: `.env.example`

- [ ] **Step 1: Add the Google client-ID env var**

Overwrite `src/env.d.ts`:

```ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_MODE?: 'mock' | 'live'
  readonly VITE_APPS_SCRIPT_URL?: string
  readonly VITE_GOOGLE_CLIENT_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

- [ ] **Step 2: Create `.env.example`**

Create `.env.example`:

```bash
# Copy to .env.local for local live testing (mock mode needs none of these).
# Mode: "mock" (default, offline seed data) or "live" (real Apps Script backend).
VITE_API_MODE=mock

# Deployed Apps Script web app URL (live mode). See docs/superpowers/guides/apps-script-setup.md
VITE_APPS_SCRIPT_URL=

# Google OAuth 2.0 Web client ID (live mode), e.g. 1234-abc.apps.googleusercontent.com
VITE_GOOGLE_CLIENT_ID=
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/env.d.ts .env.example
git commit -m "feat: add Google client ID env var and .env.example"
```

---

## Task 3: Auth helpers (token, JWT decode, GIS typing)

**Files:**
- Create: `src/auth/token.ts`
- Create: `src/auth/googleJwt.ts`
- Create: `src/auth/google.d.ts`

- [ ] **Step 1: Token storage with an expiry event**

Create `src/auth/token.ts`:

```ts
const KEY = 'finance-id-token'

/** Dispatched when the stored token is cleared (e.g. server says unauthorized). */
export const AUTH_EXPIRED_EVENT = 'finance-auth-expired'

export function getToken(): string | null {
  return localStorage.getItem(KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(KEY)
  window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT))
}
```

- [ ] **Step 2: Client-side JWT decode (for display only)**

Create `src/auth/googleJwt.ts`. Server-side verification is authoritative; this only reads email/name/exp to show the user and detect local expiry.

```ts
export interface GooglePayload {
  email: string
  name: string
  exp: number // seconds since epoch
}

export function decodeJwt(token: string): GooglePayload | null {
  try {
    const payload = token.split('.')[1]
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    const p = JSON.parse(json) as { email?: string; name?: string; exp?: number }
    if (!p.email || !p.exp) return null
    return { email: p.email, name: p.name ?? p.email, exp: p.exp }
  } catch {
    return null
  }
}
```

- [ ] **Step 3: GIS window typing**

Create `src/auth/google.d.ts`:

```ts
export {}

interface GoogleIdConfig {
  client_id: string
  callback: (response: { credential: string }) => void
}

interface GoogleButtonOptions {
  theme?: 'outline' | 'filled_blue' | 'filled_black'
  size?: 'small' | 'medium' | 'large'
  text?: string
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize(config: GoogleIdConfig): void
          renderButton(parent: HTMLElement, options: GoogleButtonOptions): void
          prompt(): void
          disableAutoSelect(): void
        }
      }
    }
  }
}
```

- [ ] **Step 4: Verify it compiles**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/auth/token.ts src/auth/googleJwt.ts src/auth/google.d.ts
git commit -m "feat: add auth token storage, JWT decode, and GIS typing"
```

---

## Task 4: AppsScriptApi live adapter + selector

**Files:**
- Create: `src/api/appsScript/AppsScriptApi.ts`
- Modify: `src/api/index.ts`

- [ ] **Step 1: Write the live adapter**

All calls POST `{action, token, payload}` as `text/plain` (avoids a CORS preflight Apps Script can't answer). Create `src/api/appsScript/AppsScriptApi.ts`:

```ts
import type {
  FinanceApi,
  NewFund,
  NewBill,
  NewExpendable,
  NewDebt,
  NewDebtPayment,
  NewSavings,
  NewSavingsTransfer,
} from '../FinanceApi.ts'
import type {
  FinanceData,
  FundEntry,
  Bill,
  ExpendableEntry,
  Debt,
  DebtPayment,
  SavingsEntry,
  SavingsTransfer,
} from '../../types.ts'
import { getToken, clearToken } from '../../auth/token.ts'

/** Thrown when the backend rejects the token; triggers re-sign-in. */
export class AuthError extends Error {
  constructor() {
    super('unauthorized')
    this.name = 'AuthError'
  }
}

export class AppsScriptApi implements FinanceApi {
  constructor(private readonly url: string) {}

  private async call<T>(action: string, payload?: unknown): Promise<T> {
    const token = getToken()
    const res = await fetch(this.url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, token, payload }),
    })
    const json = (await res.json()) as { data?: T; error?: string }
    if (json.error) {
      if (json.error === 'unauthorized') {
        clearToken()
        throw new AuthError()
      }
      throw new Error(json.error)
    }
    return json.data as T
  }

  getAll(): Promise<FinanceData> {
    return this.call<FinanceData>('getAll')
  }

  addFund(input: NewFund): Promise<FundEntry> {
    return this.call<FundEntry>('addFund', input)
  }

  addBill(input: NewBill): Promise<Bill> {
    return this.call<Bill>('addBill', input)
  }

  setBillPaid(id: number, paid: boolean): Promise<Bill> {
    return this.call<Bill>('setBillPaid', { id, paid })
  }

  addExpendable(input: NewExpendable): Promise<ExpendableEntry> {
    return this.call<ExpendableEntry>('addExpendable', input)
  }

  async setMonthlyBudget(month: string, amount: number): Promise<void> {
    await this.call<null>('setMonthlyBudget', { month, amount })
  }

  addDebt(input: NewDebt): Promise<Debt> {
    return this.call<Debt>('addDebt', input)
  }

  payDebt(input: NewDebtPayment): Promise<{ payment: DebtPayment; debt: Debt }> {
    return this.call<{ payment: DebtPayment; debt: Debt }>('payDebt', input)
  }

  addSavings(input: NewSavings): Promise<SavingsEntry> {
    return this.call<SavingsEntry>('addSavings', input)
  }

  transferSavingsToFunds(
    input: NewSavingsTransfer,
  ): Promise<{ transfer: SavingsTransfer; fund: FundEntry }> {
    return this.call<{ transfer: SavingsTransfer; fund: FundEntry }>(
      'transferSavingsToFunds',
      input,
    )
  }
}
```

- [ ] **Step 2: Wire the selector**

Overwrite `src/api/index.ts`:

```ts
import type { FinanceApi } from './FinanceApi.ts'
import { MockApi } from './mock/MockApi.ts'
import { AppsScriptApi } from './appsScript/AppsScriptApi.ts'

let instance: FinanceApi | null = null

export function getApi(): FinanceApi {
  if (instance) return instance
  const mode = import.meta.env.VITE_API_MODE ?? 'mock'
  const url = import.meta.env.VITE_APPS_SCRIPT_URL
  if (mode === 'live' && url) {
    instance = new AppsScriptApi(url)
  } else {
    if (mode === 'live') {
      console.warn('VITE_API_MODE=live but VITE_APPS_SCRIPT_URL is missing; using mock.')
    }
    instance = new MockApi()
  }
  return instance
}

export type { FinanceApi } from './FinanceApi.ts'
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/api/appsScript/AppsScriptApi.ts src/api/index.ts
git commit -m "feat: add AppsScript live adapter and wire selector"
```

---

## Task 5: Real Google Sign-In (AuthContext + SignIn)

**Files:**
- Modify: `src/auth/AuthContext.tsx`
- Modify: `src/pages/SignIn.tsx`

- [ ] **Step 1: Rewrite AuthContext to support mock stub + live GIS**

Overwrite `src/auth/AuthContext.tsx`:

```tsx
import { createContext, useState, useCallback, useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { getToken, setToken, clearToken, AUTH_EXPIRED_EVENT } from './token.ts'
import { decodeJwt } from './googleJwt.ts'

export interface AuthUser {
  email: string
  name: string
}

export interface AuthState {
  user: AuthUser | null
  live: boolean
  signIn: () => void
  signOut: () => void
  renderButton: (el: HTMLElement | null) => void
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthState | null>(null)

const LIVE = import.meta.env.VITE_API_MODE === 'live'
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''
const STUB_USER: AuthUser = { email: 'ken.gagno@vibeteams.ai', name: 'Ken' }

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const buttonElRef = useRef<HTMLElement | null>(null)
  const initialized = useRef(false)

  const adoptToken = useCallback((token: string) => {
    const p = decodeJwt(token)
    if (!p || p.exp * 1000 <= Date.now()) {
      clearToken()
      setUser(null)
      return
    }
    setToken(token)
    setUser({ email: p.email, name: p.name })
  }, [])

  const signOut = useCallback(() => {
    clearToken()
    setUser(null)
    if (LIVE) window.google?.accounts.id.disableAutoSelect()
  }, [])

  const renderButton = useCallback((el: HTMLElement | null) => {
    buttonElRef.current = el
    if (el && window.google && initialized.current) {
      window.google.accounts.id.renderButton(el, { theme: 'outline', size: 'large' })
    }
  }, [])

  // Live mode: restore existing token, load GIS, listen for expiry.
  useEffect(() => {
    if (!LIVE) return

    const existing = getToken()
    if (existing) adoptToken(existing)

    const onExpired = () => setUser(null)
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired)

    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => {
      if (!window.google || !CLIENT_ID) return
      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: (resp) => adoptToken(resp.credential),
      })
      initialized.current = true
      if (buttonElRef.current) {
        window.google.accounts.id.renderButton(buttonElRef.current, {
          theme: 'outline',
          size: 'large',
        })
      }
    }
    document.head.appendChild(script)

    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired)
  }, [adoptToken])

  const signIn = useCallback(() => {
    if (LIVE) window.google?.accounts.id.prompt()
    else setUser(STUB_USER)
  }, [])

  return (
    <AuthContext.Provider value={{ user, live: LIVE, signIn, signOut, renderButton }}>
      {children}
    </AuthContext.Provider>
  )
}
```

- [ ] **Step 2: Update SignIn to render the GIS button in live mode**

Overwrite `src/pages/SignIn.tsx`:

```tsx
import { useEffect, useRef } from 'react'
import { useAuth } from '../auth/useAuth.ts'

export function SignIn() {
  const { signIn, renderButton, live } = useAuth()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (live) renderButton(ref.current)
  }, [live, renderButton])

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="mb-1 text-xl font-bold text-slate-900">Finance Tracker</h1>
        <p className="mb-6 text-sm text-slate-500">Sign in to continue</p>
        {live ? (
          <div ref={ref} className="flex justify-center" />
        ) : (
          <button
            type="button"
            onClick={signIn}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Sign in with Google
          </button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify it compiles + build**

Run: `npx tsc -b`
Expected: no errors.

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/auth/AuthContext.tsx src/pages/SignIn.tsx
git commit -m "feat: add real Google Sign-In with mock fallback"
```

---

## Task 6: GitHub Pages build config + deploy workflow

**Files:**
- Modify: `vite.config.ts`
- Modify: `src/App.tsx`
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: Set the Pages base path (build only)**

Overwrite `vite.config.ts` (keep all existing plugins; the Tailwind plugin was added in Plan 1):

```ts
/// <reference types="vite/client" />
import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'

// Repo is published at https://<user>.github.io/expense/ — base only applies to the build.
// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/expense/' : '/',
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
  ],
}))
```

- [ ] **Step 2: Make the router respect the base path**

In `src/App.tsx`, change the `BrowserRouter` to use the Vite base URL as its basename. Find:

```tsx
        <BrowserRouter>
          <AuthedApp />
        </BrowserRouter>
```

Replace with:

```tsx
        <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <AuthedApp />
        </BrowserRouter>
```

(`BASE_URL` is `/expense/` in a Pages build and `/` in dev; stripping the trailing slash yields `/expense` or `''`.)

- [ ] **Step 3: Create the deploy workflow**

Create `.github/workflows/deploy.yml`. It builds in live mode using repo secrets and copies `index.html` → `404.html` so client-side routes deep-link correctly on Pages.

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [master]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run build
        env:
          VITE_API_MODE: live
          VITE_APPS_SCRIPT_URL: ${{ secrets.VITE_APPS_SCRIPT_URL }}
          VITE_GOOGLE_CLIENT_ID: ${{ secrets.VITE_GOOGLE_CLIENT_ID }}
      - run: cp dist/index.html dist/404.html
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 4: Verify it compiles + dev base sanity**

Run: `npx tsc -b`
Expected: no errors.

Run: `npm run build`
Expected: build succeeds; emitted asset paths are prefixed with `/expense/` (check `dist/index.html` references `/expense/assets/...`).

- [ ] **Step 5: Commit**

```bash
git add vite.config.ts src/App.tsx .github/workflows/deploy.yml
git commit -m "feat: configure GitHub Pages base path and deploy workflow"
```

---

## Task 7: Apps Script backend + deploy guide

**Files:**
- Create: `apps-script/Code.gs`
- Create: `docs/superpowers/guides/apps-script-setup.md`

- [ ] **Step 1: Write the Apps Script backend**

Create `apps-script/Code.gs`:

```javascript
// Finance Tracker — Google Apps Script web app backend.
// Bind this script to the Google Sheet that holds the data sheets, paste CLIENT_ID,
// then Deploy > New deployment > Web app (Execute as: Me, Access: Anyone).
// Full steps: docs/superpowers/guides/apps-script-setup.md

var CLIENT_ID = 'PASTE_YOUR_OAUTH_WEB_CLIENT_ID_HERE';

var SHEETS = {
  funds: ['id', 'source', 'amount', 'date', 'notes'],
  bills: ['id', 'name', 'amount', 'due_date', 'paid', 'notes'],
  expendable: ['id', 'month', 'daily_amount', 'date', 'notes'],
  debts: ['id', 'name', 'total_amount', 'remaining', 'type', 'interest_rate', 'notes'],
  debt_payments: ['id', 'debt_id', 'amount_paid', 'date', 'notes'],
  savings: ['id', 'date', 'amount', 'source', 'total', 'notes'],
  savings_transfers: ['id', 'date', 'amount', 'notes'],
  settings: ['key', 'value']
};

var DATA_SHEETS = ['funds', 'bills', 'expendable', 'debts', 'debt_payments', 'savings', 'savings_transfers'];

function doGet() {
  return json({ data: 'finance api ok' });
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var email = verify(body.token);
    if (!email || !isAllowed(email)) return json({ error: 'unauthorized' });
    return json({ data: dispatch(body.action, body.payload) });
  } catch (err) {
    return json({ error: String((err && err.message) || err) });
  }
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function verify(token) {
  if (!token) return null;
  var resp = UrlFetchApp.fetch(
    'https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(token),
    { muteHttpExceptions: true }
  );
  if (resp.getResponseCode() !== 200) return null;
  var info = JSON.parse(resp.getContentText());
  if (CLIENT_ID && info.aud !== CLIENT_ID) return null;
  return info.email || null;
}

function isAllowed(email) {
  return readSettings().allowedEmails.indexOf(email) !== -1;
}

function ss() { return SpreadsheetApp.getActiveSpreadsheet(); }

function sheet(name) {
  var sh = ss().getSheetByName(name);
  if (!sh) throw new Error('Missing sheet: ' + name);
  return sh;
}

function fmtDate(v) {
  if (v instanceof Date) return Utilities.formatDate(v, ss().getSpreadsheetTimeZone(), 'yyyy-MM-dd');
  return String(v);
}

function num(v) { return v === '' || v === null || v === undefined ? 0 : Number(v); }

function readRows(name) {
  var values = sheet(name).getDataRange().getValues();
  if (values.length < 2) return [];
  var headers = values[0];
  var rows = [];
  for (var i = 1; i < values.length; i++) {
    if (values[i][0] === '' && name !== 'settings') continue; // skip blank id rows
    var row = {};
    for (var c = 0; c < headers.length; c++) row[headers[c]] = values[i][c];
    rows.push(row);
  }
  return rows;
}

function coerce(name, r) {
  if (name === 'funds') return { id: num(r.id), source: String(r.source), amount: num(r.amount), date: fmtDate(r.date), notes: r.notes ? String(r.notes) : undefined };
  if (name === 'bills') return { id: num(r.id), name: String(r.name), amount: num(r.amount), due_date: fmtDate(r.due_date), paid: r.paid === true || String(r.paid).toUpperCase() === 'TRUE', notes: r.notes ? String(r.notes) : undefined };
  if (name === 'expendable') return { id: num(r.id), month: String(r.month), daily_amount: num(r.daily_amount), date: fmtDate(r.date), notes: r.notes ? String(r.notes) : undefined };
  if (name === 'debts') return { id: num(r.id), name: String(r.name), total_amount: num(r.total_amount), remaining: num(r.remaining), type: String(r.type), interest_rate: num(r.interest_rate), notes: r.notes ? String(r.notes) : undefined };
  if (name === 'debt_payments') return { id: num(r.id), debt_id: num(r.debt_id), amount_paid: num(r.amount_paid), date: fmtDate(r.date), notes: r.notes ? String(r.notes) : undefined };
  if (name === 'savings') return { id: num(r.id), date: fmtDate(r.date), amount: num(r.amount), source: String(r.source), total: num(r.total), notes: r.notes ? String(r.notes) : undefined };
  if (name === 'savings_transfers') return { id: num(r.id), date: fmtDate(r.date), amount: num(r.amount), notes: r.notes ? String(r.notes) : undefined };
  return r;
}

function appendRow(name, obj) {
  var row = SHEETS[name].map(function (h) {
    return obj[h] !== undefined && obj[h] !== null ? obj[h] : '';
  });
  sheet(name).appendRow(row);
}

function nextId(name) {
  var rows = readRows(name);
  var max = 0;
  for (var i = 0; i < rows.length; i++) { var id = num(rows[i].id); if (id > max) max = id; }
  return max + 1;
}

function findSheetRow(name, id) {
  var values = sheet(name).getDataRange().getValues();
  for (var i = 1; i < values.length; i++) if (num(values[i][0]) === num(id)) return i + 1;
  return -1;
}

function setCell(name, id, col, value) {
  var rowIndex = findSheetRow(name, id);
  if (rowIndex === -1) throw new Error(name + ' ' + id + ' not found');
  sheet(name).getRange(rowIndex, SHEETS[name].indexOf(col) + 1).setValue(value);
}

function getById(name, id) {
  var rows = readRows(name);
  for (var i = 0; i < rows.length; i++) if (num(rows[i].id) === num(id)) return coerce(name, rows[i]);
  return null;
}

function sumField(rows, field) {
  var t = 0;
  for (var i = 0; i < rows.length; i++) t += num(rows[i][field]);
  return t;
}

function readSettings() {
  var rows = readRows('settings');
  var monthlyBudgets = {};
  var allowedEmails = [];
  for (var i = 0; i < rows.length; i++) {
    var k = String(rows[i].key);
    var v = rows[i].value;
    if (k.indexOf('budget_') === 0) monthlyBudgets[k.substring(7)] = num(v);
    else if (k === 'allowed_email' && v) allowedEmails.push(String(v));
  }
  return { monthlyBudgets: monthlyBudgets, allowedEmails: allowedEmails };
}

function getAll() {
  var data = {};
  DATA_SHEETS.forEach(function (name) {
    data[name] = readRows(name).map(function (r) { return coerce(name, r); });
  });
  data.settings = readSettings();
  return data;
}

function dispatch(action, p) {
  switch (action) {
    case 'getAll': return getAll();
    case 'addFund': return addFund(p);
    case 'addBill': return addBill(p);
    case 'setBillPaid': return setBillPaid(p);
    case 'addExpendable': return addExpendable(p);
    case 'setMonthlyBudget': return setMonthlyBudget(p);
    case 'addDebt': return addDebt(p);
    case 'payDebt': return payDebt(p);
    case 'addSavings': return addSavings(p);
    case 'transferSavingsToFunds': return transferSavingsToFunds(p);
    default: throw new Error('Unknown action: ' + action);
  }
}

function addFund(p) {
  var fund = { id: nextId('funds'), source: p.source, amount: p.amount, date: p.date, notes: p.notes || '' };
  appendRow('funds', fund);
  return coerce('funds', fund);
}

function addBill(p) {
  var bill = { id: nextId('bills'), name: p.name, amount: p.amount, due_date: p.due_date, paid: p.paid === true, notes: p.notes || '' };
  appendRow('bills', bill);
  return coerce('bills', bill);
}

function setBillPaid(p) {
  setCell('bills', p.id, 'paid', p.paid === true);
  return getById('bills', p.id);
}

function addExpendable(p) {
  var entry = { id: nextId('expendable'), month: p.month, daily_amount: p.daily_amount, date: p.date, notes: p.notes || '' };
  appendRow('expendable', entry);
  return coerce('expendable', entry);
}

function setMonthlyBudget(p) {
  var key = 'budget_' + p.month;
  var values = sheet('settings').getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][0]) === key) {
      sheet('settings').getRange(i + 1, 2).setValue(p.amount);
      return null;
    }
  }
  sheet('settings').appendRow([key, p.amount]);
  return null;
}

function addDebt(p) {
  var debt = {
    id: nextId('debts'), name: p.name, total_amount: p.total_amount, remaining: p.remaining,
    type: p.type, interest_rate: p.interest_rate, notes: p.notes || ''
  };
  appendRow('debts', debt);
  return coerce('debts', debt);
}

function payDebt(p) {
  var payment = { id: nextId('debt_payments'), debt_id: p.debt_id, amount_paid: p.amount_paid, date: p.date, notes: p.notes || '' };
  appendRow('debt_payments', payment);
  var debt = getById('debts', p.debt_id);
  if (!debt) throw new Error('Debt not found');
  var newRemaining = debt.remaining - num(p.amount_paid);
  setCell('debts', p.debt_id, 'remaining', newRemaining);
  debt.remaining = newRemaining;
  return { payment: coerce('debt_payments', payment), debt: debt };
}

function addSavings(p) {
  var prior = sumField(readRows('savings'), 'amount') - sumField(readRows('savings_transfers'), 'amount');
  var entry = { id: nextId('savings'), date: p.date, amount: p.amount, source: p.source, total: prior + num(p.amount), notes: p.notes || '' };
  appendRow('savings', entry);
  return coerce('savings', entry);
}

function transferSavingsToFunds(p) {
  var transfer = { id: nextId('savings_transfers'), date: p.date, amount: p.amount, notes: p.notes || '' };
  appendRow('savings_transfers', transfer);
  var fund = { id: nextId('funds'), source: 'Savings', amount: p.amount, date: p.date, notes: p.notes || '' };
  appendRow('funds', fund);
  return { transfer: coerce('savings_transfers', transfer), fund: coerce('funds', fund) };
}
```

- [ ] **Step 2: Write the deploy guide**

Create `docs/superpowers/guides/apps-script-setup.md`:

```markdown
# Apps Script Backend & Deploy Setup

One-time setup to connect the app to your private Google Sheet and deploy it.

## 1. Create the Google Sheet

1. Create a new Google Sheet (this is your private database).
2. Create one tab per sheet, with the **exact** lowercase names and a header row
   matching these columns (row 1 = headers):

   - `funds`: `id | source | amount | date | notes`
   - `bills`: `id | name | amount | due_date | paid | notes`
   - `expendable`: `id | month | daily_amount | date | notes`
   - `debts`: `id | name | total_amount | remaining | type | interest_rate | notes`
   - `debt_payments`: `id | debt_id | amount_paid | date | notes`
   - `savings`: `id | date | amount | source | total | notes`
   - `savings_transfers`: `id | date | amount | notes`
   - `settings`: `key | value`

3. In `settings`, add at least one whitelist row:
   - `key` = `allowed_email`, `value` = your Google email (e.g. `you@gmail.com`)
   - Optionally seed a budget: `key` = `budget_2026-06`, `value` = `900`

   (The app also writes `budget_<month>` rows when you set a monthly budget.)

> Tip: format the `date` / `due_date` columns as Plain text to avoid timezone
> surprises; the backend also normalizes Date cells to `yyyy-MM-dd`.

## 2. Add the Apps Script

1. In the Sheet: **Extensions → Apps Script**.
2. Replace the default `Code.gs` with the contents of `apps-script/Code.gs` from this repo.
3. Leave `CLIENT_ID` for now — you'll paste it in step 3.

## 3. Create an OAuth Web Client ID

1. Go to Google Cloud Console → **APIs & Services → Credentials**
   (create/select a project).
2. Configure the OAuth consent screen (External, add your email as a test user).
3. **Create Credentials → OAuth client ID → Web application**.
4. Under **Authorized JavaScript origins**, add:
   - `http://localhost:5173` (local dev)
   - `https://<your-github-username>.github.io` (Pages origin — no path)
5. Copy the client ID (looks like `1234-abc.apps.googleusercontent.com`).
6. Paste it into `CLIENT_ID` at the top of `Code.gs` and save.

## 4. Deploy the Apps Script web app

1. In the Apps Script editor: **Deploy → New deployment → Web app**.
2. Execute as: **Me**. Who has access: **Anyone**.
   (Access is "Anyone" so the browser fetch works without a Google session for
   Apps Script itself; security is enforced by the ID-token check + whitelist.)
3. Authorize when prompted. Copy the **Web app URL** (ends in `/exec`).

## 5. Configure the frontend

**Local live testing** — create `.env.local`:

```
VITE_API_MODE=live
VITE_APPS_SCRIPT_URL=<your /exec URL>
VITE_GOOGLE_CLIENT_ID=<your client ID>
```

Run `npm run dev` and open `http://localhost:5173` — the Google button should
appear and only whitelisted emails can load data.

**GitHub Pages** — in the repo: **Settings → Secrets and variables → Actions**,
add repository secrets:

- `VITE_APPS_SCRIPT_URL` = your `/exec` URL
- `VITE_GOOGLE_CLIENT_ID` = your client ID

Then **Settings → Pages → Build and deployment → Source = GitHub Actions**.
Pushing to `master` runs `.github/workflows/deploy.yml`, which builds in live
mode and publishes to `https://<username>.github.io/expense/`.

## Notes

- The repo is named `expense`, so Vite `base` is `/expense/`. If you rename the
  repo, update `base` in `vite.config.ts`.
- ID tokens expire ~1 hour; the app drops you back to the sign-in screen when the
  backend reports `unauthorized`.
```

- [ ] **Step 3: Commit**

```bash
git add apps-script/Code.gs docs/superpowers/guides/apps-script-setup.md
git commit -m "feat: add Apps Script backend and deploy guide"
```

---

## Task 8: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Typecheck and mock build**

Run: `npx tsc -b`
Expected: no errors.

Run: `npm run build`
Expected: build succeeds; `dist/index.html` references `/expense/assets/...`.

- [ ] **Step 2: Mock-mode smoke check (no Google needed)**

Run: `npm run dev`, open the URL.
Expected: still works exactly as before — stub "Sign in with Google" button → Dashboard $2,500.00 → all modules function. (Live mode is exercised only after the user completes the Apps Script setup guide.)

- [ ] **Step 3: Final commit (if anything was left unstaged)**

```bash
git status
# nothing to commit expected
```

---

## Done — Plan 3 outcome

The app now has a complete, deployable backend path: a live `AppsScriptApi` selected by `VITE_API_MODE=live`, real Google Sign-In with server-side verification + whitelist, a GitHub Pages deploy workflow, and the Apps Script + setup guide for the user to stand up their private Sheet. Mock mode remains the zero-config default for development. The savings balance double-count is fixed.

**User action required after merge:** follow `docs/superpowers/guides/apps-script-setup.md` to create the Sheet, deploy the Apps Script, create the OAuth client ID, and add the GitHub secrets.
