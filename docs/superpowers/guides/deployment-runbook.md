# Deployment Runbook

End-to-end, from nothing deployed to a working site at
`https://gagnokenneth.github.io/finance-tracker/`.

Do the phases in order — each one produces a value the next one needs.

| Phase | Produces | Needed by |
|---|---|---|
| 2. Sheet + Apps Script | `/exec` web app URL | Phases 3, 4 |
| 3. Local live test | Confidence the backend works | — |
| 4. GitHub setup | Secrets + Pages enabled | Phase 5 |
| 5. Merge and deploy | The live site | — |

---

## Phase 1 — nothing to do

Auth is username/password against your own backend, so there is no OAuth client,
no consent screen, and no Google client ID. Skip to Phase 2.

## Phase 2 — Sheet and Apps Script

1. Create a new, **empty** Google Sheet. Don't build any tabs; the backend
   creates them.
2. **Extensions → Apps Script.** Replace the default `Code.gs` with the current
   contents of `apps-script/Code.gs` from this repo.
3. Paste your client ID into `CLIENT_ID` at the top of the file. Save.
4. **Deploy → New deployment → Web app.**
   - Execute as: **Me**
   - Who has access: **Anyone**

   "Anyone" is required so the browser's `fetch` reaches the script without a
   Google session of its own. Security comes from the ID-token check plus the
   `allowed_email` whitelist, not from this setting.
5. Authorize when prompted. Copy the **Web app URL**, ending in `/exec`.

> **Whenever you edit `Code.gs` later, you must deploy a new version.** Saving
> the editor does not change what the `/exec` URL serves. Use
> **Deploy → Manage deployments → edit → Version: New version**, which keeps the
> same URL.

## Phase 3 — Local live test

Prove the backend works before involving GitHub. Create `.env.local` in the repo
root (it is gitignored):

```
VITE_API_MODE=live
VITE_APPS_SCRIPT_URL=<your /exec URL>
```

```bash
nvm use          # reads .nvmrc → Node 24
npm run dev
```

Open `http://localhost:5173`. Expected sequence:

1. Sign-in succeeds.
2. The app shows: *"This backend has no allowed users yet. In the settings
   sheet, add a row with key `allowed_email`…"*
3. Open the Sheet — **the tabs now exist**, created by that first request.
4. In the `settings` tab add one row: `key` = `allowed_email`,
   `value` = your Google address.
5. Reload. The Debts page loads empty and you can add a debt.

That last step is the real checkpoint: it proves token verification, the
whitelist, and a write all work.

> You can skip the round trip by creating just the `settings` tab yourself
> (headers `key | value`) with the `allowed_email` row before first sign-in.

## Phase 4 — GitHub setup

**Secrets** — repo → Settings → Secrets and variables → Actions → New
repository secret:

| Name | Value |
|---|---|
| `VITE_APPS_SCRIPT_URL` | your `/exec` URL |

`VITE_GOOGLE_CLIENT_ID` is obsolete — delete it if it is still set.

Both are compiled into the built JavaScript and are therefore public. That is
expected: a Google client ID is not a secret, and the `/exec` URL is protected
by the token check and the whitelist.

**Pages** — repo → Settings → Pages → Build and deployment →
Source = **GitHub Actions**.

Do this *before* the first run. `actions/deploy-pages` fails if Pages has never
been enabled.

> Pages on a **private** repo requires a paid GitHub plan. If the repo is
> private on the free plan, either make it public or host elsewhere. The repo
> contains no secrets — the Sheet holds the data and the whitelist guards it.

## Phase 5 — Merge and deploy

`.github/workflows/deploy.yml` triggers on **push to `master`**. Work on a
feature branch does not deploy, however green it is.

```bash
git checkout master
git pull
git merge feat/debts-refactor-side-nav-settings
npx tsc -b && npm run lint && npm run build   # verify the merged result
git push
```

Watch the run under the repo's **Actions** tab. It builds with
`VITE_API_MODE=live`, copies `index.html` to `404.html` so deep links survive a
refresh, and publishes to Pages.

## Verify the deploy

1. Open `https://gagnokenneth.github.io/finance-tracker/` — the sign-in card appears.
2. Sign in. The Debts page loads.
3. Open a debt, then **hard-reload that URL**. It should still work — this is
   what the `404.html` copy is for.
4. Add a debt and confirm the row appears in the Sheet.

If step 4 writes nothing but the UI looks fine, the build fell back to mock
mode — see below.

## Failure modes

| Symptom | Cause |
|---|---|
| Data loads but nothing reaches the Sheet | `VITE_APPS_SCRIPT_URL` missing. `getApi()` falls back to `MockApi` with only a console warning, so the site serves local seed data. |
| "Signup is closed" | No `signup_code` row in the `settings` sheet. |
| `unauthorized` on every request | The stored session was signed with a different `SESSION_SECRET`. Sign in again. |
| Everyone logged out at once | `SESSION_SECRET` changed. |
| All passwords suddenly wrong | `PW_PEPPER` changed. It must never be rotated. |
| Blank page, 404s for JS/CSS | `base` in `vite.config.ts` no longer matches the repo name. It is `/finance-tracker/`. |
| Backend changes have no effect | Apps Script deployment still points at an old version. Deploy a new version. |
| Signed out after about an hour | Expected. Google ID tokens expire; sign in again. |
