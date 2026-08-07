# User Accounts and Per-User Data — Design

Date: 2026-08-07
Branch: `feat/user-accounts`

## Goal

Replace Google Sign-In with self-hosted username/password accounts, and tie every
row of data to the user who created it, so each person signing in sees only their
own debts.

## Decisions

| Question | Decision |
|---|---|
| Auth mechanism | Username + password, self-hosted. Google Sign-In removed entirely. |
| Existing data | Fresh start. No migration; debt tabs are recreated with the new shape. |
| `allowed_email` whitelist | Removed. Account ownership replaces it. |
| Signup | Requires an invite code, checked against `settings` key `signup_code`. |
| Login identifier | Username. No email is stored, so there is no self-service reset. |
| Password hashing | PBKDF2 in the browser, peppered SHA-256 on the server. |
| Sessions | Stateless HMAC-signed token. **Never expires.** |
| Currency setting | Moves from global to per-user. |

### Accepted risks

These were raised and accepted deliberately:

- **Self-hosted passwords are weaker than delegating to Google.** We now own
  hashing, brute-force resistance, and session handling.
- **Sessions never expire**, so a stolen token is valid indefinitely. The only
  revocation lever is rotating `SESSION_SECRET`, which signs out every user at
  once.
- **No password reset flow.** A forgotten password is fixed by the spreadsheet
  owner replacing `pw_hash` using the provided helper.
- **The salt is derived from the username, not random.** The browser must know
  the salt before it can hash, and fetching a random per-user salt would let
  anyone probe which usernames exist. Unique per user, but predictable; the
  210,000-iteration count is what carries the weight here.

## 1 — Credentials

New `users` sheet:

```
users   id | username | pw_hash | currency | created
```

`username` is stored lowercase and must be unique. No salt column: the salt is
`SHA256("finance-tracker:" + username)`, recomputed by the client each time.

### Hashing

```
browser:  derived = PBKDF2-HMAC-SHA256(password, salt, 210_000 iterations, 32 bytes)
              ↓ TLS
server:   stored  = base64(SHA256(derived + PW_PEPPER))
```

The expensive work happens in the browser because WebCrypto is native and fast,
while Apps Script offers only `computeHmacSha256Signature` — a hand-rolled
210,000-iteration loop there would take tens of seconds per login.

The server still applies its own digest so that a leaked spreadsheet does not
hand over usable credentials. `PW_PEPPER` is **not in the sheet**, so a sheet leak
alone yields nothing guessable; even with the pepper, every guess must run the
full client-side PBKDF2.

Minimum password length: 10 characters. No composition rules.

### Secrets

`PW_PEPPER` and `SESSION_SECRET` live in Script Properties. `initSecrets()`
generates each from `Utilities.getUuid()` if absent and is called at the top of
`doPost`, so there is no manual setup step.

**Changing `PW_PEPPER` invalidates every stored password.** It is written once
and never rotated.

### Session token

```
token = base64url(JSON.stringify({ uid, username })) + "." +
        base64url(HMAC-SHA256(payloadPart, SESSION_SECRET))
```

The payload carries `username` as well as `uid` so the app can render "signed in
as" on restore without a lookup. It is safe to read from the token because the
HMAC covers it — a tampered payload fails verification. The server always takes
`uid` from the verified payload, never from the request body.

Verification recomputes the HMAC and compares. No expiry claim is checked. This
requires no sheet read and no network call, which makes it cheaper than the
Google `tokeninfo` round trip it replaces.

The client stores the token in `localStorage` under `finance-session` and sends
it in the existing `token` field, so the request envelope is unchanged.

### Actions

| Action | Payload | Returns |
|---|---|---|
| `signup` | `{ username, derived, invite_code }` | `{ token, user }` |
| `login` | `{ username, derived }` | `{ token, user }` |

`user` is `{ id, username }`.

Errors, worded to avoid leaking information:

- Wrong username *or* wrong password → `Wrong username or password.`
- Username already exists → `That username is taken.`
- Bad invite code → `That invite code isn't valid.`
- Too many attempts → `Too many attempts. Wait a minute and try again.`
- Password shorter than 10 characters → `Use at least 10 characters.`

### Brute-force limit

A `CacheService` counter keyed by username caps login attempts at 5 per minute.
The `/exec` endpoint is public, so this is required rather than optional.

## 2 — Per-user data

Every data sheet gains `user_id` as its second column:

```
debts            id | user_id | name | type
debt_schedule    id | user_id | debt_id | due_date | amount | paid | paid_date | paid_amount
debt_statements  id | user_id | debt_id | due_date | min_due | total_due | outstanding | paid | paid_date | paid_amount
```

`debt_schedule` and `debt_statements` carry `user_id` even though `debt_id`
already implies an owner. This is deliberate: filtering directly on `user_id`
means a bug in debt lookup cannot leak another user's rows, and no join is
required to scope a query.

### Two invariants

1. **Every read filters by the token's `user_id`.** `getAll` returns only the
   caller's rows.
2. **Every write verifies ownership before mutating**, through a single helper:

   ```js
   function assertOwned(name, id, userId)  // throws 'not found' when it isn't
   ```

   Guessing another user's row id returns `not found`, never their data.

`assertOwned` is called by `updateDebt`, `deleteDebt`, and every schedule and
statement update or delete. `addScheduleRow` and `addStatement` additionally
assert that the parent `debt_id` belongs to the caller.

### Settings

The `settings` sheet keeps only `signup_code`. `allowed_email` is removed, and
`currency` moves to the user's own row so each person chooses their own.

`FinanceData.settings` therefore changes shape: `allowedEmails` is deleted, and
`currency` is populated from the **caller's user row** rather than the settings
sheet. `getAll` reads that row for the authenticated `uid`. The frontend keeps
reading `data.settings.currency`, so `useCurrency` needs no change.

```ts
export interface Settings {
  monthlyBudgets: Record<string, number>   // retained, unread
  currency: Currency                       // from the user's own row
}
```

`setCurrency` writes the `currency` cell on the caller's user row.

`monthlyBudgets` remains in the sheet, unread — the Expendable module that used it
is unreachable. It is not migrated to per-user; if that module is ever revived it
will need its own `user_id`.

## 3 — Frontend

### New and removed

**Create:** `src/auth/password.ts` (WebCrypto PBKDF2 wrapper),
`src/auth/session.ts` (token storage).

**Remove:** `src/auth/googleJwt.ts`, `src/auth/google.d.ts`,
`src/auth/mockSession.ts`, `src/auth/token.ts`, and all Google Identity Services
script loading from `AuthContext.tsx`.

**Modify:** `AuthContext.tsx`, `SignIn.tsx`, `types.ts`, `FinanceApi.ts`, both API
adapters, `seed.ts`, `apps-script/Code.gs`.

`VITE_GOOGLE_CLIENT_ID` is no longer used; the GitHub secret and the
`CLIENT_ID` constant in `Code.gs` both go away.

### Sign-in screen

One card with two modes, toggled by a link:

```
┌──────────────────────────┐   ┌──────────────────────────┐
│   Finance Tracker        │   │   Create your account    │
│   Sign in                │   │                          │
│  Username [          ]   │   │  Username    [        ]  │
│  Password [          ]   │   │  Password    [        ]  │
│  [ Sign in ]             │   │  Invite code [        ]  │
│  Create an account       │   │  [ Create account ]      │
└──────────────────────────┘   └──────────────────────────┘
```

Hashing runs on submit, before the request. It takes a few hundred milliseconds,
so the button shows a pending state.

### Auth state

`AuthUser` becomes `{ id: number; username: string }`. The provider restores the
session during `useState` initialisation by reading the token and its embedded
`uid` — no `setState` inside an effect, matching the existing constraint.

An `AuthError` from any request clears the stored token and returns the user to
the sign-in screen, as it does today.

### Mock mode

`MockApi` keeps a `users` array in its localStorage database and implements
`signup` and `login` with the same client-derived hash, so offline development
still works. Its seed ships with no users; you create one through the UI.

## 4 — Errors and verification

Auth failures render inline on the sign-in card. Data-loading failures continue
to use `LoadError`, which surfaces the backend's message.

No automated tests, per project convention. Verification:

```
npx tsc -b
npm run lint
npm run build
```

Executed checks for the pure logic: PBKDF2 output is stable for the same
username and password, differs when either changes, and token sign/verify
round-trips while rejecting a tampered payload.

Manual pass in mock mode:

1. Create an account with the invite code; a wrong code is rejected.
2. Sign out, sign back in; a wrong password is rejected.
3. Add a debt, reload — it persists and the session survives.
4. Create a **second** account. It sees **no** debts from the first.
5. Set currency to USD on one account; confirm the other still shows PHP.
6. Confirm the first account's debts are intact and unchanged.

Step 4 is the one that matters: it is the whole point of the change.

Live deployment additionally requires deleting the `debts`, `debt_schedule`, and
`debt_statements` tabs so they are recreated with `user_id`, and adding a
`signup_code` row to `settings`.
