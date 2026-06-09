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
