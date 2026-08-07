# User Accounts and Per-User Data — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Google Sign-In with username/password accounts and scope every row of data to the user who owns it.

**Architecture:** Expensive password hashing runs in the browser via WebCrypto PBKDF2; the server applies a peppered SHA-256 so a leaked spreadsheet yields nothing usable. Sessions are stateless HMAC-signed tokens verified locally — no sheet read, no network call. Every data sheet carries a `user_id`, every read filters on it, and every write asserts ownership first.

**Tech Stack:** React 19, TypeScript ~6.0, Vite 8, TanStack Query 5, Tailwind 4, Google Apps Script + Sheets.

## Global Constraints

- **No automated tests** by project convention. Verification is `npx tsc -b`, `npm run lint`, `npm run build`, executed checks for pure logic, plus a manual pass. Do not add a test framework.
- **No `Co-Authored-By` trailer** in any commit message.
- **No `setState` inside `useEffect`** — the lint config rejects it. Derive during render.
- `user_id` is **server-side only**. It never appears in `src/types.ts`, so `Debt`, `DebtScheduleRow` and `DebtStatement` are unchanged and the UI needs no edits for tenancy.
- The `uid` acted on is **always** taken from the verified token, **never** from a request payload.
- Secrets (`PW_PEPPER`, `SESSION_SECRET`) live in Script Properties, never in a sheet.
- `crypto.subtle` requires a secure context — fine on `https://` and `localhost`.

## File Structure

**Create:**
| File | Responsibility |
|---|---|
| `src/auth/password.ts` | WebCrypto PBKDF2 credential derivation |
| `src/auth/session.ts` | Token storage + payload decode for display |

**Delete:** `src/auth/googleJwt.ts`, `src/auth/google.d.ts`, `src/auth/mockSession.ts`, `src/auth/token.ts`

**Modify:** `apps-script/Code.gs`, `src/auth/AuthContext.tsx`, `src/pages/SignIn.tsx`, `src/types.ts`, `src/api/FinanceApi.ts`, `src/api/appsScript/AppsScriptApi.ts`, `src/api/mock/MockApi.ts`, `src/api/mock/seed.ts`, `src/lib/summary.ts`, `docs/superpowers/guides/*`

**Milestones:** M1 = Tasks 1–3 (server auth). M2 = Tasks 4–5 (server tenancy). M3 = Tasks 6–10 (frontend). **Every milestone here is risk-touching — auth, security, data isolation — so each gets a review.**

---

### Task 1: Server schema and secrets

**Files:** Modify `apps-script/Code.gs`

**Produces:** `users` sheet definition, `user_id` columns, `initSecrets()`, `pepper()`, `sessionSecret()`.

- [ ] **Step 1: Update `SHEETS` and drop `CLIENT_ID`**

Delete the `var CLIENT_ID = ...` line entirely. Replace the debt entries and add `users`:

```js
var SHEETS = {
  users: ['id', 'username', 'pw_hash', 'currency', 'created'],
  funds: ['id', 'source', 'amount', 'date', 'notes'],
  bills: ['id', 'name', 'amount', 'due_date', 'paid', 'notes'],
  expendable: ['id', 'month', 'daily_amount', 'date', 'notes'],
  debts: ['id', 'user_id', 'name', 'type'],
  debt_schedule: ['id', 'user_id', 'debt_id', 'due_date', 'amount', 'paid', 'paid_date', 'paid_amount'],
  debt_statements: ['id', 'user_id', 'debt_id', 'due_date', 'min_due', 'total_due', 'outstanding', 'paid', 'paid_date', 'paid_amount'],
  savings: ['id', 'date', 'amount', 'source', 'total', 'notes'],
  savings_transfers: ['id', 'date', 'amount', 'notes'],
  settings: ['key', 'value']
};
```

`users` is deliberately **not** in `DATA_SHEETS` — it is never returned to the client.

- [ ] **Step 2: Add secret bootstrap**

```js
function props() { return PropertiesService.getScriptProperties(); }

/**
 * Generates the two secrets on first use so there is no manual setup step.
 * PW_PEPPER must never be rotated: changing it invalidates every stored
 * password, because it is mixed into the hash.
 */
function initSecrets() {
  var p = props();
  if (!p.getProperty('PW_PEPPER')) p.setProperty('PW_PEPPER', Utilities.getUuid() + Utilities.getUuid());
  if (!p.getProperty('SESSION_SECRET')) p.setProperty('SESSION_SECRET', Utilities.getUuid() + Utilities.getUuid());
}

function pepper() { return props().getProperty('PW_PEPPER'); }
function sessionSecret() { return props().getProperty('SESSION_SECRET'); }
```

- [ ] **Step 3: Update `coerce` so `user_id` never reaches the client**

The debt branches keep their existing shape — no `user_id` key:

```js
if (name === 'debts') return { id: num(r.id), name: String(r.name), type: String(r.type) };
```

`debt_schedule` and `debt_statements` likewise stay exactly as they are. Only the sheet gains the column; the wire format is unchanged, which is why no frontend type changes.

- [ ] **Step 4: Commit**

```bash
git add apps-script/Code.gs
git commit -m "feat: add users sheet, user_id columns, and secret bootstrap"
```

---

### Task 2: Password hashing and session tokens (server)

**Files:** Modify `apps-script/Code.gs`

**Produces:** `hashCredential()`, `signToken()`, `verifyToken()`, `constantTimeEquals()`, `rateLimit()`.

- [ ] **Step 1: Credential hash**

```js
/**
 * The client already ran 210k PBKDF2 iterations; this adds the server-held
 * pepper so a leaked spreadsheet does not contain usable credentials.
 */
function hashCredential(derived) {
  return Utilities.base64Encode(
    Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(derived) + pepper())
  );
}
```

- [ ] **Step 2: Token sign and verify**

```js
function signToken(payloadObj) {
  var payload = Utilities.base64EncodeWebSafe(JSON.stringify(payloadObj));
  return payload + '.' + Utilities.base64EncodeWebSafe(
    Utilities.computeHmacSha256Signature(payload, sessionSecret())
  );
}

/** Returns { uid, username } or null. No expiry is enforced — sessions do not expire. */
function verifyToken(token) {
  if (!token) return null;
  var parts = String(token).split('.');
  if (parts.length !== 2) return null;
  var expected = Utilities.base64EncodeWebSafe(
    Utilities.computeHmacSha256Signature(parts[0], sessionSecret())
  );
  if (!constantTimeEquals(parts[1], expected)) return null;
  try {
    return JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(parts[0])).getDataAsString());
  } catch (err) {
    return null;
  }
}

/** Compares without leaking where the first difference is. */
function constantTimeEquals(a, b) {
  a = String(a); b = String(b);
  if (a.length !== b.length) return false;
  var diff = 0;
  for (var i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
```

- [ ] **Step 3: Rate limiter**

```js
/** Returns false once more than `max` attempts happen inside the window. */
function rateLimit(key, max, seconds) {
  var cache = CacheService.getScriptCache();
  var k = 'rl_' + key;
  var n = Number(cache.get(k) || 0) + 1;
  cache.put(k, String(n), seconds);
  return n <= max;
}
```

- [ ] **Step 4: Commit**

```bash
git add apps-script/Code.gs
git commit -m "feat: add credential hashing, signed session tokens, and rate limiting"
```

---

### Task 3: signup and login actions

**Files:** Modify `apps-script/Code.gs`

**Produces:** `signup(p)`, `login(p)`, `findUserByUsername()`, `userById()`, rewritten `doPost`.

- [ ] **Step 1: User lookup helpers**

```js
function normalizeUsername(u) { return String(u || '').trim().toLowerCase(); }

function findUserByUsername(username) {
  var rows = readRows('users');
  for (var i = 0; i < rows.length; i++) {
    if (normalizeUsername(rows[i].username) === username) {
      return { id: num(rows[i].id), username: String(rows[i].username), pw_hash: String(rows[i].pw_hash) };
    }
  }
  return null;
}

function userById(id) {
  var rows = readRows('users');
  for (var i = 0; i < rows.length; i++) {
    if (num(rows[i].id) === num(id)) {
      return {
        id: num(rows[i].id),
        username: String(rows[i].username),
        currency: rows[i].currency ? String(rows[i].currency) : 'PHP'
      };
    }
  }
  return null;
}
```

- [ ] **Step 2: signup**

```js
function signup(p) {
  var username = normalizeUsername(p.username);
  if (username.length < 3) return { error: 'Pick a username of at least 3 characters.' };
  if (!p.derived) return { error: 'Use at least 10 characters.' };

  var expected = settingValue('signup_code');
  if (!expected) return { error: 'Signup is closed. No signup_code is set in the settings sheet.' };
  if (String(p.invite_code || '') !== expected) return { error: "That invite code isn't valid." };

  if (findUserByUsername(username)) return { error: 'That username is taken.' };

  var user = {
    id: nextId('users'),
    username: username,
    pw_hash: hashCredential(p.derived),
    currency: 'PHP',
    created: new Date().toISOString().slice(0, 10)
  };
  appendRow('users', user);
  SpreadsheetApp.flush();

  return { data: sessionResponse(user.id, username) };
}

function sessionResponse(uid, username) {
  return { token: signToken({ uid: uid, username: username }), user: { id: uid, username: username } };
}
```

- [ ] **Step 3: login**

```js
function login(p) {
  var username = normalizeUsername(p.username);
  if (!rateLimit('login_' + username, 5, 60)) {
    return { error: 'Too many attempts. Wait a minute and try again.' };
  }
  var user = findUserByUsername(username);
  // Same message either way, so this cannot be used to discover usernames.
  if (!user) return { error: 'Wrong username or password.' };
  if (!constantTimeEquals(user.pw_hash, hashCredential(p.derived))) {
    return { error: 'Wrong username or password.' };
  }
  return { data: sessionResponse(user.id, user.username) };
}
```

- [ ] **Step 4: Add `settingValue` and rewrite `readSettings`**

`allowed_email` is gone; `currency` now comes from the user row.

```js
function settingValue(key) {
  var rows = readRows('settings');
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].key) === key) return String(rows[i].value);
  }
  return '';
}

/** Global settings only. Currency is per-user and added by getAll. */
function readSettings() {
  var rows = readRows('settings');
  var monthlyBudgets = {};
  for (var i = 0; i < rows.length; i++) {
    var k = String(rows[i].key);
    if (k.indexOf('budget_') === 0) monthlyBudgets[k.substring(7)] = num(rows[i].value);
  }
  return { monthlyBudgets: monthlyBudgets };
}
```

- [ ] **Step 5: Rewrite `doPost`**

```js
function doPost(e) {
  try {
    initSecrets();
    var body = JSON.parse(e.postData.contents);
    ensureSheets();

    var action = body.action;
    if (action === 'signup') return json(signup(body.payload || {}));
    if (action === 'login') return json(login(body.payload || {}));

    var session = verifyToken(body.token);
    if (!session || !session.uid) return json({ error: 'unauthorized' });

    var result = dispatch(action, body.payload, session.uid);
    if (RETURNS_DATA[action]) {
      SpreadsheetApp.flush();
      return json({ data: getAll(session.uid) });
    }
    return json({ data: result });
  } catch (err) {
    return json({ error: String((err && err.message) || err) });
  }
}
```

Note `signup` and `login` already return `{data}` or `{error}`, so they are passed to `json` directly.

Delete `verify()` and the whole `tokeninfo` block — it is no longer reachable.

- [ ] **Step 6: Commit**

```bash
git add apps-script/Code.gs
git commit -m "feat: add signup and login with invite code and rate limiting"
```

**→ Milestone M1. Review the combined diff of Tasks 1–3 (auth, security).**

---

### Task 4: Scope every read and write to the user

**Files:** Modify `apps-script/Code.gs`

**Produces:** `readOwnedRows()`, `assertOwned()`, `getAll(uid)`, all actions taking `uid`.

- [ ] **Step 1: Owned reads**

```js
function readOwnedRows(name, uid) {
  var rows = readRows(name);
  var out = [];
  for (var i = 0; i < rows.length; i++) {
    if (num(rows[i].user_id) === num(uid)) out.push(rows[i]);
  }
  return out;
}
```

- [ ] **Step 2: `getAll` takes a uid**

```js
function getAll(uid) {
  var data = {};
  DATA_SHEETS.forEach(function (name) {
    if (ACTIVE_SHEETS.indexOf(name) === -1) { data[name] = []; return; }
    data[name] = readOwnedRows(name, uid).map(function (r) { return coerce(name, r); });
  });
  var user = userById(uid);
  data.settings = readSettings();
  data.settings.currency = user ? user.currency : 'PHP';
  return data;
}
```

- [ ] **Step 3: Ownership assertion**

```js
/**
 * Throws 'not found' when the row does not exist OR belongs to someone else.
 * Identical message either way, so ids cannot be probed for existence.
 */
function assertOwned(name, id, uid) {
  var rows = readRows(name);
  for (var i = 0; i < rows.length; i++) {
    if (num(rows[i].id) === num(id)) {
      if (num(rows[i].user_id) !== num(uid)) throw new Error('not found');
      return;
    }
  }
  throw new Error('not found');
}
```

- [ ] **Step 4: Thread `uid` through every action**

`dispatch(action, p, uid)` passes `uid` to each handler. Updated handlers:

```js
function addDebt(p, uid) {
  var debt = { id: nextId('debts'), user_id: uid, name: p.name, type: p.type };
  appendRow('debts', debt);

  var target = p.type === 'fixed' ? 'debt_schedule' : 'debt_statements';
  var rows = p.rows || [];
  var baseId = nextId(target);
  var prepared = rows.map(function (row, i) {
    var copy = {};
    for (var k in row) if (Object.prototype.hasOwnProperty.call(row, k)) copy[k] = row[k];
    copy.id = baseId + i;
    copy.user_id = uid;
    copy.debt_id = debt.id;
    return copy;
  });
  appendRows(target, prepared);
  return null;
}

function updateDebt(p, uid) {
  assertOwned('debts', p.id, uid);
  setCell('debts', p.id, 'name', p.patch.name);
  return null;
}

function deleteDebt(p, uid) {
  assertOwned('debts', p.id, uid);
  deleteRowsWhere('debt_schedule', 'debt_id', p.id);
  deleteRowsWhere('debt_statements', 'debt_id', p.id);
  deleteRowById('debts', p.id);
  return null;
}

function addChildRow(name, p, uid) {
  assertOwned('debts', p.debtId, uid);   // the parent debt must be yours
  var row = {};
  for (var k in p.input) if (Object.prototype.hasOwnProperty.call(p.input, k)) row[k] = p.input[k];
  row.id = nextId(name);
  row.user_id = uid;
  row.debt_id = p.debtId;
  appendRow(name, row);
  return null;
}

function updateChildRow(name, p, uid) {
  assertOwned(name, p.id, uid);
  return patchRow(name, p.id, normalizePaidPatch(p.patch));
}

function deleteChildRow(name, p, uid) {
  assertOwned(name, p.id, uid);
  deleteRowById(name, p.id);
  return null;
}

function setCurrency(p, uid) {
  setCell('users', uid, 'currency', p.currency);
  return null;
}
```

`patchRow` must never write `user_id` or `debt_id` — extend its skip list from `['id','debt_id']` to `['id','user_id','debt_id']`.

- [ ] **Step 5: Commit**

```bash
git add apps-script/Code.gs
git commit -m "feat: scope every read and write to the authenticated user"
```

**→ Milestone M2. Review the combined diff of Task 4 (data isolation).**

---

### Task 5: Client-side credential derivation

**Files:** Create `src/auth/password.ts`

- [ ] **Step 1: Write the module**

```ts
/**
 * Password hashing happens here, in the browser, because WebCrypto PBKDF2 is
 * native and fast. Apps Script offers only computeHmacSha256Signature, where a
 * 210k-iteration loop would take tens of seconds per login.
 *
 * The salt is derived from the username rather than random: the browser needs it
 * before it can hash, and fetching a random per-user salt would reveal which
 * usernames exist. Unique per user, but predictable — the iteration count is
 * what carries the weight.
 */
const ITERATIONS = 210_000
const SITE = 'finance-tracker:'

export const MIN_PASSWORD_LENGTH = 10

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

export async function deriveCredential(username: string, password: string): Promise<string> {
  const enc = new TextEncoder()
  const salt = new Uint8Array(
    await crypto.subtle.digest('SHA-256', enc.encode(SITE + username.trim().toLowerCase())),
  )
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, [
    'deriveBits',
  ])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    key,
    256,
  )
  return toHex(new Uint8Array(bits))
}
```

- [ ] **Step 2: Verify by execution**

Run a script under `node` (Node 24 exposes `crypto.subtle` globally) asserting: same inputs give the same hex; a different password differs; a different username differs; output is 64 hex characters.

- [ ] **Step 3: Commit**

```bash
git add src/auth/password.ts
git commit -m "feat: derive password credentials with WebCrypto PBKDF2"
```

---

### Task 6: Session storage

**Files:** Create `src/auth/session.ts`; delete `src/auth/token.ts`, `src/auth/mockSession.ts`

- [ ] **Step 1: Write the module**

```ts
const KEY = 'finance-session'

/** Dispatched when the stored token is cleared, so the UI can return to sign-in. */
export const AUTH_EXPIRED_EVENT = 'finance-auth-expired'

export interface SessionUser {
  id: number
  username: string
}

export function readToken(): string | null {
  return localStorage.getItem(KEY)
}

export function writeToken(token: string): void {
  localStorage.setItem(KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(KEY)
  // The API layer clears the token when the backend rejects it; without this
  // event the UI would keep rendering as if signed in.
  window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT))
}

/**
 * Reads the display fields out of the token payload. NOT verification — the
 * signature is checked by the backend on every request. This only avoids a
 * round trip to render "signed in as" after a reload.
 */
export function decodeSession(token: string | null): SessionUser | null {
  if (!token) return null
  const payload = token.split('.')[0]
  if (!payload) return null
  try {
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    const parsed = JSON.parse(json) as { uid?: number; username?: string }
    if (typeof parsed.uid !== 'number' || !parsed.username) return null
    return { id: parsed.uid, username: parsed.username }
  } catch {
    return null
  }
}
```

- [ ] **Step 2: Delete the Google-era modules**

```bash
git rm src/auth/token.ts src/auth/mockSession.ts src/auth/googleJwt.ts src/auth/google.d.ts
```

- [ ] **Step 3: Commit** (the build will not pass until Task 8; that is expected)

```bash
git add src/auth/session.ts
git commit -m "feat: add session token storage and remove Google auth modules"
```

---

### Task 7: API surface for signup and login

**Files:** Modify `src/api/FinanceApi.ts`, `src/api/appsScript/AppsScriptApi.ts`, `src/types.ts`

- [ ] **Step 1: Drop `allowedEmails` from `Settings`**

```ts
export interface Settings {
  monthlyBudgets: Record<string, number>
  currency: Currency
}
```

- [ ] **Step 2: Extend `FinanceApi`**

```ts
export interface AuthResult {
  token: string
  user: { id: number; username: string }
}

export interface SignupInput {
  username: string
  derived: string
  invite_code: string
}

export interface LoginInput {
  username: string
  derived: string
}

// added to the interface:
  signup(input: SignupInput): Promise<AuthResult>
  login(input: LoginInput): Promise<AuthResult>
```

- [ ] **Step 3: Implement in `AppsScriptApi`**

Swap the `getToken`/`clearToken` import to `readToken`/`clearToken` from `../../auth/session.ts`, then:

```ts
  signup(input: SignupInput): Promise<AuthResult> {
    return this.call<AuthResult>('signup', input)
  }

  login(input: LoginInput): Promise<AuthResult> {
    return this.call<AuthResult>('login', input)
  }
```

- [ ] **Step 4: Commit**

```bash
git add src/api/FinanceApi.ts src/api/appsScript/AppsScriptApi.ts src/types.ts
git commit -m "feat: add signup and login to the API surface"
```

---

### Task 8: Mock adapter with users

**Files:** Modify `src/api/mock/MockApi.ts`, `src/api/mock/seed.ts`

- [ ] **Step 1: Give the mock database a user dimension**

```ts
interface MockUser {
  id: number
  username: string
  /** The client-derived value, stored as-is. Mock mode only — no pepper. */
  pw_hash: string
}

interface MockDb {
  users: MockUser[]
  /** One FinanceData blob per user id — isolation for free. */
  data: Record<string, FinanceData>
}
```

`createSeed()` returns the empty `FinanceData` used for each new user. The mock DB starts as `{ users: [], data: {} }`; you create an account through the UI.

- [ ] **Step 2: Implement `signup` / `login`**

```ts
  async signup(input: SignupInput): Promise<AuthResult> {
    const db = this.loadDb()
    const username = input.username.trim().toLowerCase()
    // Mock has no settings sheet to hold a real code, but it still requires the
    // field so the signup form is exercised the same way it is on live.
    if (!input.invite_code.trim()) throw new Error("That invite code isn't valid.")
    if (db.users.some((u) => u.username === username)) {
      throw new Error('That username is taken.')
    }
    const user: MockUser = {
      id: db.users.reduce((m, u) => Math.max(m, u.id), 0) + 1,
      username,
      pw_hash: input.derived,
    }
    db.users.push(user)
    db.data[String(user.id)] = createSeed()
    this.saveDb(db)
    return this.delay({ token: mockToken(user), user: { id: user.id, username } })
  }

  async login(input: LoginInput): Promise<AuthResult> {
    const db = this.loadDb()
    const username = input.username.trim().toLowerCase()
    const user = db.users.find((u) => u.username === username)
    if (!user || user.pw_hash !== input.derived) {
      throw new Error('Wrong username or password.')
    }
    return this.delay({ token: mockToken(user), user: { id: user.id, username } })
  }
```

`mockToken(user)` produces the same two-part shape the real backend uses so
`decodeSession` works unchanged, with a fixed unsigned second part:

```ts
function mockToken(user: MockUser): string {
  const payload = btoa(JSON.stringify({ uid: user.id, username: user.username }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
  return `${payload}.mock`
}
```

- [ ] **Step 3: Scope every other mock method to the current user**

A private `current()` reads the token via `readToken()` + `decodeSession()` and returns that user's `FinanceData`, throwing `unauthorized` when absent. `load`/`save` become per-user. Every existing debt method operates on that blob; their bodies are otherwise unchanged.

`setCurrency` writes into that user's `settings.currency`.

- [ ] **Step 4: Commit**

```bash
git add src/api/mock
git commit -m "feat: give the mock adapter accounts and per-user data"
```

---

### Task 9: Auth context and sign-in screen

**Files:** Modify `src/auth/AuthContext.tsx`, `src/pages/SignIn.tsx`

- [ ] **Step 1: Rewrite `AuthContext`**

All Google machinery goes: the script loader, `renderButton`, `live`, `AUTH_EXPIRED_EVENT` wiring, `STUB_USER`.

```tsx
export interface AuthUser {
  id: number
  username: string
}

export interface AuthState {
  user: AuthUser | null
  signIn: (username: string, password: string) => Promise<void>
  signUp: (username: string, password: string, inviteCode: string) => Promise<void>
  signOut: () => void
}
```

The provider restores during `useState` init — `decodeSession(readToken())` — so no effect calls `setState`. `signIn` derives the credential, calls `getApi().login(...)`, writes the token, sets the user. `signUp` mirrors it with the invite code. `signOut` clears the token and the user.

A `useEffect` subscribes to the auth-expired event so a rejected token returns to the sign-in screen; the handler only clears state, which the lint rule permits.

- [ ] **Step 2: Rewrite `SignIn`**

One card, two modes held in local state (`'signin' | 'signup'`). Fields: username, password, and invite code in signup mode. On submit it calls `signIn`/`signUp` inside try/catch and renders `err.message` inline — the backend's wording is already user-facing.

Hashing takes a few hundred milliseconds, so the button shows `Signing in…` / `Creating account…` while pending.

Signup validates `password.length >= MIN_PASSWORD_LENGTH` client-side before hashing, showing `Use at least 10 characters.`

Keep the settled-strip motif and the existing card styling.

- [ ] **Step 3: Verify and commit**

```bash
npx tsc -b && npm run lint && npm run build
git add src/auth/AuthContext.tsx src/pages/SignIn.tsx
git commit -m "feat: replace Google sign-in with username and password"
```

---

### Task 10: Loose ends

**Files:** Modify `src/lib/summary.ts`, `.env.example`, `docs/superpowers/guides/*`

- [ ] **Step 1: `summary.ts`**

Nothing references `allowedEmails`, but confirm `npx tsc -b` is clean after the `Settings` change; fix any fallout in the unlinked pages so the whole repo still typechecks.

- [ ] **Step 2: `.env.example`**

Remove `VITE_GOOGLE_CLIENT_ID` and note that it is obsolete.

- [ ] **Step 3: Guides**

In `apps-script-setup.md`: delete the OAuth client and `CLIENT_ID` steps, delete the `allowed_email` row, add the `signup_code` row, and add the `users` sheet plus the `user_id` columns. In `deployment-runbook.md`: drop the OAuth phase and the `VITE_GOOGLE_CLIENT_ID` secret, and add "delete the three debt tabs so they are recreated with `user_id`".

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "docs: update setup for username and password accounts"
```

**→ Milestone M3. Review Tasks 5–10, then run `/simplify`, then the final whole-branch review.**

---

## Final verification

- [ ] `npx tsc -b`, `npm run lint`, `npm run build` all clean
- [ ] Executed checks: PBKDF2 determinism and sensitivity; `decodeSession` round-trip and rejection of a malformed token
- [ ] Manual pass in mock mode (clear `localStorage` first):
  1. Create an account; a wrong invite code is rejected (mock skips the code — verify on live)
  2. Sign out, sign in again; a wrong password is rejected
  3. Add a debt, reload — data and session both persist
  4. **Create a second account: it sees no debts from the first**
  5. Set USD on one account; the other still shows PHP
  6. Sign back into the first account; its debts are intact
- [ ] Step 4 is the whole point of the change — do not skip it

## Live deployment notes

1. Re-paste `Code.gs`, deploy a **new version** of the existing deployment.
2. Delete the `debts`, `debt_schedule` and `debt_statements` tabs so they are recreated with `user_id`. Delete `allowed_email` rows.
3. Add a `settings` row: `key` = `signup_code`, `value` = a code of your choosing. **Signup is closed until this exists.**
4. Remove the `VITE_GOOGLE_CLIENT_ID` GitHub secret and rebuild.
