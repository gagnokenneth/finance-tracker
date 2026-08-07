# Apps Script Backend & Deploy Setup

One-time setup to connect the app to your private Google Sheet and deploy it.

## 1. Create the Google Sheet

1. Create a new Google Sheet (this is your private database). An empty one is
   fine.
2. **You do not need to create the tabs by hand.** On the first signed-in
   request, the backend creates every missing tab and writes its header row, so
   you can skip ahead to step 2 and let it build the structure for you.

   Headers on a tab that already has content are never rewritten — silently
   relabelling columns of real data would be worse than failing.

   For reference, this is what it creates:

   - `funds`: `id | source | amount | date | notes`
   - `bills`: `id | name | amount | due_date | paid | notes`
   - `expendable`: `id | month | daily_amount | date | notes`
   - `users`: `id | username | pw_hash | currency | created`
   - `debts`: `id | user_id | name | type`
   - `debt_schedule`: `id | user_id | debt_id | due_date | amount | paid | paid_date | paid_amount`
   - `debt_statements`: `id | user_id | debt_id | due_date | min_due | total_due | outstanding | paid | paid_date | paid_amount`
   - `savings`: `id | date | amount | source | total | notes`
   - `savings_transfers`: `id | date | amount | notes`
   - `settings`: `key | value`

   `debt_schedule` holds the installments of a **fixed** debt; `debt_statements`
   holds the statements of a **revolving** one. A debt uses whichever table
   matches its `type`.

3. In `settings`, add one row — **signup is closed until it exists**:
   - `key` = `signup_code`, `value` = a code of your choosing

   You hand that code to anyone who should be able to create an account. Change
   it at any time to stop new signups. Every account then sees only its own data.

   (The app also writes `budget_<month>` rows when you set a monthly budget.)

> **Upgrading an existing sheet is automatic.** On the first request after a
> deployment, the backend compares each tab's header row against the expected
> columns. A tab whose shape is stale is **renamed** to
> `<name>_old_<timestamp>` and a fresh one is created in its place — the old rows
> are archived beside it, never deleted, so nothing is lost if the change was
> unexpected. Delete the archived tabs yourself once you are satisfied.
>
> Old `allowed_email` rows can stay; they are simply ignored.

> Tip: format the `date` / `due_date` columns as Plain text to avoid timezone
> surprises; the backend also normalizes Date cells to `yyyy-MM-dd`.

## 2. Add the Apps Script

1. In the Sheet: **Extensions → Apps Script**.
2. Replace the default `Code.gs` with the contents of `apps-script/Code.gs` from this repo.
3. Nothing to paste. `PW_PEPPER` and `SESSION_SECRET` are generated automatically
   into Script Properties on the first request.

## 3. Deploy the Apps Script web app

1. In the Apps Script editor: **Deploy → New deployment → Web app**.
2. Execute as: **Me**. Who has access: **Anyone**.
   (Access is "Anyone" so the browser fetch works without a Google session for
   Apps Script itself; security is enforced by the ID-token check + whitelist.)
3. Authorize when prompted. Copy the **Web app URL** (ends in `/exec`).

## 4. Configure the frontend

**Local live testing** — create `.env.local`:

```
VITE_API_MODE=live
VITE_APPS_SCRIPT_URL=<your /exec URL>
```

Run `npm run dev` and open `http://localhost:5173`. Create an account using your
`signup_code`; each account sees only its own data.

**GitHub Pages** — in the repo: **Settings → Secrets and variables → Actions**,
add repository secrets:

- `VITE_APPS_SCRIPT_URL` = your `/exec` URL

Then **Settings → Pages → Build and deployment → Source = GitHub Actions**.
Pushing to `master` runs `.github/workflows/deploy.yml`, which builds in live
mode and publishes to `https://<username>.github.io/finance-tracker/`.

## Notes

- The repo is named `finance-tracker`, so Vite `base` is `/finance-tracker/`. If you rename the
  repo, update `base` in `vite.config.ts`.
- Sessions do not expire. Signing out is the normal way to end one; rotating
  `SESSION_SECRET` in Script Properties signs out every user at once.
- **Never change `PW_PEPPER`** — it is mixed into every stored password hash, so
  changing it invalidates every account.
- Forgotten passwords are reset by hand: delete the user's row, or replace
  `pw_hash`, and have them sign up again with the same username.
