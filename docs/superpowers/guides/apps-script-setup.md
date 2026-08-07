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
   - `debts`: `id | name | type`
   - `debt_schedule`: `id | debt_id | due_date | amount | paid | paid_date | paid_amount`
   - `debt_statements`: `id | debt_id | due_date | min_due | total_due | outstanding | paid | paid_date | paid_amount`
   - `savings`: `id | date | amount | source | total | notes`
   - `savings_transfers`: `id | date | amount | notes`
   - `settings`: `key | value`

   `debt_schedule` holds the installments of a **fixed** debt; `debt_statements`
   holds the statements of a **revolving** one. A debt uses whichever table
   matches its `type`.

3. In `settings`, add at least one whitelist row. **This is the one row you must
   add yourself** — the whitelist is the security boundary, so it is never
   auto-populated. Seeding it with the first caller would hand your data to
   whoever reached the URL first. Until you add it, the app shows: *"This
   backend has no allowed users yet…"*
   - `key` = `allowed_email`, `value` = your Google email (e.g. `you@gmail.com`)
   - Optionally seed a budget: `key` = `budget_2026-06`, `value` = `900`
   - Optionally set the currency: `key` = `currency`, `value` = `PHP` or `USD`
     (defaults to `PHP` when absent; the Settings page writes this row)

   (The app also writes `budget_<month>` rows when you set a monthly budget.)

> **Upgrading an existing sheet.** The debt model changed and there is no
> migration, by design. Delete the old `debts` and `debt_payments` tabs, then
> recreate `debts` with the three columns above and add the two new tabs.

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
mode and publishes to `https://<username>.github.io/finance-tracker/`.

## Notes

- The repo is named `finance-tracker`, so Vite `base` is `/finance-tracker/`. If you rename the
  repo, update `base` in `vite.config.ts`.
- ID tokens expire ~1 hour; the app drops you back to the sign-in screen when the
  backend reports `unauthorized`.
