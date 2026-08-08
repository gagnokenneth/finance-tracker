# Finance Tracker

A personal debt-payoff tracker. Track what you owe across multiple debts, record the
payment schedule and monthly statements for each, and see what is due, soon, or settled.

The data lives in a Google Sheet. A Google Apps Script web app sits in front of it as a
small JSON API, so there is no server to run or pay for — the frontend is a static site
and the spreadsheet is the database.

## Stack

React 19 + TypeScript, Vite, Tailwind CSS v4, TanStack Query, React Router.
Backend is a single Apps Script file (`apps-script/Code.gs`).

## Running it

Requires Node 24 (see `.nvmrc` — `nvm use` picks it up). Vite 8 will not start on Node 18.

```bash
npm install
npm run dev
```

That runs in **mock mode** by default: seeded in-memory data, no Google account, no
network. Good enough for all UI work.

To point at a real backend, copy `.env.example` to `.env.local` and set:

```
VITE_API_MODE=live
VITE_APPS_SCRIPT_URL=<your deployed Apps Script web app URL>
```

If `live` is set without a URL, it falls back to mock and warns in the console.

Scripts: `npm run dev`, `npm run build`, `npm run lint`, `npm run preview`.

## How it fits together

`src/api/` defines a `FinanceApi` interface with two implementations — `MockApi` for
local seed data and `AppsScriptApi` for the deployed backend. `getApi()` in
`src/api/index.ts` picks one based on the env vars, so nothing above that layer knows
which is in use.

Everything above reads through one TanStack Query hook, `useFinanceData()`, which
fetches the whole dataset under a single `['finance','all']` key. Writes go through
`useFinanceMutations()`; the debt mutations return the updated dataset and write it
straight into the cache, avoiding a second round-trip.

Auth is username/password against the Apps Script backend, with sign-up gated by
single-use invite codes. Mock mode skips the invite code entirely.

## Routes

Only `/debts`, `/debts/:id`, and `/settings` are registered. `Dashboard`, `Funds`,
`Bills`, `Savings`, and `Expendable` still exist under `src/pages/` from an earlier,
broader version of the app, but are deliberately unrouted. Unknown paths land on
`/debts`.

## Notes

- No test suite — changes are verified with `npm run build` (which typechecks),
  `npm run lint`, and a manual pass.
- `docs/` is gitignored and local-only.
