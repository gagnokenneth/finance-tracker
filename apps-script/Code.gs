// Finance Tracker — Google Apps Script web app backend.
// Bind this script to the Google Sheet that holds the data sheets, then
// Deploy > New deployment > Web app (Execute as: Me, Access: Anyone).
// Secrets are generated automatically on first use; nothing to paste here.
// Full steps: docs/superpowers/guides/apps-script-setup.md

var INVITE_COUNT = 50;

var SHEETS = {
  users: ['id', 'username', 'pw_hash', 'currency', 'created'],
  bills: ['id', 'user_id', 'name', 'type', 'frequency', 'amount', 'day', 'second_day', 'month', 'closed'],
  bill_payables: ['id', 'user_id', 'bill_id', 'due_date', 'amount', 'paid', 'paid_date', 'paid_amount'],
  debts: ['id', 'user_id', 'name', 'type'],
  debt_schedule: ['id', 'user_id', 'debt_id', 'due_date', 'amount', 'paid', 'paid_date', 'paid_amount'],
  debt_statements: ['id', 'user_id', 'debt_id', 'due_date', 'min_due', 'total_due', 'outstanding', 'paid', 'paid_date', 'paid_amount'],
  income: ['id', 'user_id', 'source_id', 'amount', 'date', 'notes', 'allocation_period_id'],
  income_sources: ['id', 'user_id', 'name', 'archived'],
  savings_ledger: ['id', 'user_id', 'date', 'amount', 'kind', 'ref_type', 'ref_id', 'notes'],
  allocations: ['id', 'user_id', 'name', 'frequency', 'day', 'second_day', 'month', 'closed'],
  allocation_periods: ['id', 'user_id', 'allocation_id', 'period_date'],
  allocation_lines: ['id', 'user_id', 'period_id', 'target_type', 'target_id', 'label', 'planned_amount', 'committed', 'committed_date', 'committed_amount', 'source'],
  invites: ['code', 'used_by', 'used_at']
};

/**
 * Bump this whenever a sheet's columns change. It busts the ensureSheets cache
 * so the new shape is applied on the very next request after a deployment,
 * instead of up to an hour later.
 */
var SCHEMA_VERSION = 8;

/*
 * Tabs whose stale shape may be DISCARDED and recreated. Deliberately excludes
 * users and invites: a column change there would otherwise delete every account
 * and password hash on the next request, re-seed fresh codes, and lock everyone
 * out with no recovery path.
 */
var REBUILDABLE_SHEETS = ['debts', 'debt_schedule', 'debt_statements', 'bills', 'bill_payables', 'income', 'income_sources', 'savings_ledger', 'allocations', 'allocation_periods', 'allocation_lines'];

var DATA_SHEETS = ['bills', 'bill_payables', 'debts', 'debt_schedule', 'debt_statements', 'income', 'income_sources', 'savings_ledger', 'allocations', 'allocation_periods', 'allocation_lines'];

/**
 * Sheets getAll actually reads. Every sheet read is a separate round trip, so
 * reading the ones no screen displays is pure latency.
 *
 * IMPORTANT: a module ticket that starts reading a sheet must add it here in
 * the same change. A sheet in DATA_SHEETS but not here is reported as an empty
 * array, so its page renders blank even though the rows exist.
 */
var ACTIVE_SHEETS = ['debts', 'debt_schedule', 'debt_statements', 'bills', 'bill_payables'];

/** Actions that return the full dataset instead of the affected row. */
var RETURNS_DATA = {
  addDebt: true, updateDebt: true, deleteDebt: true,
  addScheduleRow: true, updateScheduleRow: true, deleteScheduleRow: true,
  addStatement: true, updateStatement: true, deleteStatement: true,
  addBill: true, updateBill: true, closeBill: true, deleteBill: true,
  updateBillPayable: true, deleteBillPayable: true, payBillPayable: true,
  setCurrency: true
};

function doGet() {
  return json({ data: 'finance api ok' });
}

function doPost(e) {
  try {
    initSecrets();
    var body = JSON.parse(e.postData.contents);
    ensureSheets();

    var action = body.action;
    // These two are the only unauthenticated actions.
    if (action === 'signup') return json(signup(body.payload || {}));
    if (action === 'login') return json(login(body.payload || {}));

    var session = verifyToken(body.token);
    if (!session || !session.uid) return json({ error: 'unauthorized' });

    // uid always comes from the verified token, never from the payload.
    var result = dispatch(action, body.payload, session.uid);

    // Writes answer with the whole updated dataset, read back in this SAME
    // execution: one request instead of two, and no window where a separate
    // read observes state from before the write.
    if (RETURNS_DATA[action]) {
      SpreadsheetApp.flush();
      return json({ data: getAll(session.uid) });
    }
    return json({ data: result });
  } catch (err) {
    return json({ error: String((err && err.message) || err) });
  }
}

/**
 * Creates any missing tab and writes its header row. Idempotent, so it can run
 * on every request: a fully set-up spreadsheet costs one lookup per tab.
 *
 * Headers on an EXISTING non-empty sheet are left alone — silently rewriting
 * them could mislabel columns of real data.
 */
function ensureSheets() {
  // Confirming every tab on every request adds up, so the result is cached.
  // The key carries SCHEMA_VERSION, so a deployment that changes columns
  // re-checks immediately rather than waiting for the cache to expire.
  var cache = CacheService.getScriptCache();
  var readyKey = 'sheets_ready_v' + SCHEMA_VERSION;
  if (cache.get(readyKey)) return;

  // Two requests arriving with a cold cache would both try to delete and
  // recreate the same tab; the second throws. Serialise, then re-check.
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    if (cache.get(readyKey)) return;
    rebuildSheets(cache, readyKey);
  } finally {
    lock.releaseLock();
  }
}

function rebuildSheets(cache, readyKey) {
  var spreadsheet = ss();
  for (var name in SHEETS) {
    if (!Object.prototype.hasOwnProperty.call(SHEETS, name)) continue;
    var sh = spreadsheet.getSheetByName(name);

    if (!sh) {
      writeHeaders(spreadsheet.insertSheet(name), name);
      continue;
    }
    if (sh.getLastRow() === 0) {
      writeHeaders(sh, name);
      continue;
    }
    if (headersMatch(sh, name)) continue;
    // A stale shape outside the rebuildable set is left exactly as it is; losing
    // accounts is never an acceptable side effect of a deploy.
    if (REBUILDABLE_SHEETS.indexOf(name) === -1) continue;

    // Dropped and recreated. This DISCARDS the rows in that tab — deliberate, so
    // a deployment needs no manual sheet surgery. Other tabs always exist, so
    // deleting this one can never leave the file empty.
    spreadsheet.deleteSheet(sh);
    writeHeaders(spreadsheet.insertSheet(name), name);
  }

  seedInvites();
  cache.put(readyKey, '1', 3600);
}

/**
 * Puts INVITE_COUNT single-use codes in the invites sheet when it is empty, so a
 * fresh deployment can hand out accounts without inventing codes by hand. Read
 * them from the sheet; only you can see it.
 */
function seedInvites() {
  // A one-way marker, not row count: clearing the sheet is how the owner closes
  // signups, and re-seeding would silently reopen them.
  if (props().getProperty('INVITES_SEEDED')) return;
  props().setProperty('INVITES_SEEDED', '1');
  var sh = sheet('invites');
  if (sh.getLastRow() > 1) return;
  var rows = [];
  for (var i = 0; i < INVITE_COUNT; i++) rows.push([newInviteCode(), '', '']);
  sh.getRange(2, 1, rows.length, 3).setValues(rows);
}

/** Eight hex characters from a v4 UUID, grouped for readability. */
function newInviteCode() {
  var hex = Utilities.getUuid().replace(/-/g, '').toUpperCase();
  return hex.slice(0, 4) + '-' + hex.slice(4, 8);
}

function normalizeCode(c) { return String(c || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, ''); }

/**
 * Returns the sheet row of a matching unused code, or -1. Codes are compared
 * with punctuation stripped, so "ab12cd34" and "AB12-CD34" both work.
 */
function findUnusedInvite(code) {
  var wanted = normalizeCode(code);
  if (!wanted) return -1;
  var rows = readRows('invites');
  for (var i = 0; i < rows.length; i++) {
    if (normalizeCode(rows[i].code) === wanted && blank(rows[i].used_by)) return i + 2;
  }
  return -1;
}

function markInviteUsed(rowIndex, username) {
  var sh = sheet('invites');
  sh.getRange(rowIndex, 2).setValue(username);
  sh.getRange(rowIndex, 3).setValue(new Date().toISOString().slice(0, 10));
}

function writeHeaders(sh, name) {
  sh.getRange(1, 1, 1, SHEETS[name].length).setValues([SHEETS[name]]);
  sh.setFrozenRows(1);
}

/** True when row 1 is exactly the expected columns, in order. */
function headersMatch(sh, name) {
  var expected = SHEETS[name];
  var width = sh.getLastColumn();
  if (width < expected.length) return false;
  var actual = sh.getRange(1, 1, 1, width).getValues()[0];
  for (var i = 0; i < expected.length; i++) {
    if (String(actual[i]).trim().toLowerCase() !== expected[i]) return false;
  }
  return true;
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function props() { return PropertiesService.getScriptProperties(); }

/**
 * Generates the two secrets on first use so there is no manual setup step.
 *
 * PW_PEPPER must never be rotated: it is mixed into every stored password hash,
 * so changing it invalidates every account.
 */
function initSecrets() {
  var p = props();
  if (!p.getProperty('PW_PEPPER')) p.setProperty('PW_PEPPER', Utilities.getUuid() + Utilities.getUuid());
  if (!p.getProperty('SESSION_SECRET')) p.setProperty('SESSION_SECRET', Utilities.getUuid() + Utilities.getUuid());
}

function pepper() { return props().getProperty('PW_PEPPER'); }
function sessionSecret() { return props().getProperty('SESSION_SECRET'); }

/**
 * The client already ran 210k PBKDF2 iterations against a salt derived from the
 * username. This adds the server-held pepper, so a leaked spreadsheet does not
 * contain anything an attacker can start guessing against.
 */
function hashCredential(derived) {
  return Utilities.base64Encode(
    Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(derived) + pepper())
  );
}

function signToken(payloadObj) {
  var payload = Utilities.base64EncodeWebSafe(JSON.stringify(payloadObj));
  return payload + '.' + Utilities.base64EncodeWebSafe(
    Utilities.computeHmacSha256Signature(payload, sessionSecret())
  );
}

/**
 * Returns { uid, username } or null. No expiry is enforced — sessions do not
 * expire by design; rotating SESSION_SECRET is the only revocation lever.
 */
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

/** Compares without revealing where the first difference is. */
function constantTimeEquals(a, b) {
  a = String(a); b = String(b);
  if (a.length !== b.length) return false;
  var diff = 0;
  for (var i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/*
 * Failed-attempt throttle for the public /exec endpoint.
 *
 * Only failures are counted, and the window's end is stored rather than re-set
 * on each write. Counting successes and extending the TTL would let an attacker
 * hammering one username keep that account locked out indefinitely — punishing
 * the owner instead of the attacker.
 */
function failureState(key) {
  var raw = CacheService.getScriptCache().get('rl_' + key);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (err) { return null; }
}

function tooManyFailures(key, max) {
  var st = failureState(key);
  return !!st && new Date().getTime() <= st.until && st.n >= max;
}

function recordFailure(key, seconds) {
  var now = new Date().getTime();
  var st = failureState(key);
  if (!st || now > st.until) st = { n: 0, until: now + seconds * 1000 };
  st.n += 1;
  var remaining = Math.max(1, Math.ceil((st.until - now) / 1000));
  CacheService.getScriptCache().put('rl_' + key, JSON.stringify(st), remaining);
}

function normalizeUsername(u) { return String(u || '').trim().toLowerCase(); }

/*
 * ASCII only, and must match isValidUsername in src/auth/password.ts.
 *
 * Beyond being a sane identifier rule, this keeps the token payload Latin-1:
 * signToken base64-encodes UTF-8 bytes while the client decodes with atob, so a
 * non-ASCII username would render as mojibake.
 */
function isValidUsername(u) { return /^[a-z0-9][a-z0-9._-]{2,31}$/.test(u); }

function findUserByUsername(username) {
  var rows = readRows('users');
  for (var i = 0; i < rows.length; i++) {
    if (normalizeUsername(rows[i].username) === username) {
      return {
        id: num(rows[i].id),
        username: String(rows[i].username),
        pw_hash: String(rows[i].pw_hash)
      };
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

function sessionResponse(uid, username) {
  return { token: signToken({ uid: uid, username: username }), user: { id: uid, username: username } };
}

function signup(p) {
  var username = normalizeUsername(p.username);
  if (!isValidUsername(username)) {
    return { error: 'Use 3-32 characters: letters, numbers, dot, dash or underscore.' };
  }
  // Password length is a client-side policy (MIN_PASSWORD_LENGTH); the server
  // only ever sees the derived value, so all it can check is that shape.
  if (!/^[0-9a-f]{64}$/.test(String(p.derived || ''))) {
    return { error: 'Could not read those credentials. Try again.' };
  }

  /*
   * Locked: this endpoint is public, and without serialisation two concurrent
   * signups both read the same nextId('users') and the same unused invite row.
   * That yields two accounts sharing one id — and a shared id means they read
   * and write each other's data, because every query is scoped by uid.
   */
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var inviteRow = findUnusedInvite(p.invite_code);
    if (inviteRow === -1) return { error: "That invite code isn't valid or has already been used." };
    if (findUserByUsername(username)) return { error: 'That username is taken.' };

    var user = {
      id: nextId('users'),
      username: username,
      pw_hash: hashCredential(p.derived),
      currency: 'PHP',
      created: new Date().toISOString().slice(0, 10)
    };
    appendRow('users', user);
    markInviteUsed(inviteRow, username); // single use — burn it
    SpreadsheetApp.flush();
    return { data: sessionResponse(user.id, username) };
  } finally {
    lock.releaseLock();
  }
}

function login(p) {
  var username = normalizeUsername(p.username);
  var key = 'login_' + username;
  if (tooManyFailures(key, 5)) {
    return { error: 'Too many attempts. Wait a minute and try again.' };
  }
  var user = findUserByUsername(username);
  // Identical message whether the user is missing or the password is wrong, so
  // this cannot be used to discover which usernames exist.
  if (!user || !constantTimeEquals(user.pw_hash, hashCredential(p.derived))) {
    recordFailure(key, 60);
    return { error: 'Wrong username or password.' };
  }
  return { data: sessionResponse(user.id, user.username) };
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

function blank(v) { return v === '' || v === null || v === undefined; }

function bool(v) { return v === true || String(v).toUpperCase() === 'TRUE'; }

/** Optional cells come back as undefined so they are omitted from the JSON. */
function optNum(v) { return blank(v) ? undefined : Number(v); }

function optDate(v) { return blank(v) ? undefined : fmtDate(v); }

/** Blank text cell as undefined, matching optNum/optDate. */
function optStr(v) { return blank(v) ? undefined : String(v); }

function readRows(name) {
  var values = sheet(name).getDataRange().getValues();
  if (values.length < 2) return [];
  var headers = values[0];
  var rows = [];
  for (var i = 1; i < values.length; i++) {
    if (values[i][0] === '') continue; // skip blank id rows
    var row = {};
    for (var c = 0; c < headers.length; c++) row[headers[c]] = values[i][c];
    rows.push(row);
  }
  return rows;
}

function coerce(name, r) {
  if (name === 'bills') return {
    id: num(r.id), name: String(r.name), type: String(r.type), frequency: String(r.frequency),
    amount: optNum(r.amount), day: num(r.day), second_day: optNum(r.second_day),
    month: optNum(r.month), closed: bool(r.closed)
  };
  if (name === 'bill_payables') return {
    // amount uses optNum, not num: an empty cell is a variable bill's "not set
    // yet", which is not the same as zero.
    id: num(r.id), bill_id: num(r.bill_id), due_date: fmtDate(r.due_date), amount: optNum(r.amount),
    paid: bool(r.paid), paid_date: optDate(r.paid_date), paid_amount: optNum(r.paid_amount)
  };
  if (name === 'debts') return { id: num(r.id), name: String(r.name), type: String(r.type) };
  if (name === 'debt_schedule') return {
    id: num(r.id), debt_id: num(r.debt_id), due_date: fmtDate(r.due_date), amount: num(r.amount),
    paid: bool(r.paid), paid_date: optDate(r.paid_date), paid_amount: optNum(r.paid_amount)
  };
  if (name === 'debt_statements') return {
    id: num(r.id), debt_id: num(r.debt_id), due_date: fmtDate(r.due_date),
    // optNum, not num: a blank cell is an auto-generated statement's "not set
    // yet", which is not the same as zero.
    min_due: optNum(r.min_due), total_due: optNum(r.total_due), outstanding: optNum(r.outstanding),
    paid: bool(r.paid), paid_date: optDate(r.paid_date), paid_amount: optNum(r.paid_amount)
  };
  if (name === 'income') return {
    id: num(r.id), source_id: num(r.source_id), amount: num(r.amount),
    date: fmtDate(r.date), notes: optStr(r.notes),
    allocation_period_id: optNum(r.allocation_period_id)
  };
  if (name === 'income_sources') return {
    id: num(r.id), name: String(r.name), archived: bool(r.archived)
  };
  if (name === 'savings_ledger') return {
    // amount is signed: positive is a deposit, negative a withdrawal or a
    // payment. The balance is the sum and is never stored.
    id: num(r.id), date: fmtDate(r.date), amount: num(r.amount), kind: String(r.kind),
    ref_type: optStr(r.ref_type), ref_id: optNum(r.ref_id), notes: optStr(r.notes)
  };
  if (name === 'allocations') return {
    id: num(r.id), name: String(r.name), frequency: String(r.frequency), day: num(r.day),
    second_day: optNum(r.second_day), month: optNum(r.month), closed: bool(r.closed)
  };
  if (name === 'allocation_periods') return {
    id: num(r.id), allocation_id: num(r.allocation_id), period_date: fmtDate(r.period_date)
  };
  if (name === 'allocation_lines') return {
    id: num(r.id), period_id: num(r.period_id), target_type: String(r.target_type),
    target_id: optNum(r.target_id), label: optStr(r.label),
    planned_amount: num(r.planned_amount), committed: bool(r.committed),
    committed_date: optDate(r.committed_date), committed_amount: optNum(r.committed_amount),
    source: optStr(r.source)
  };
  return r;
}

function appendRow(name, obj) {
  var row = SHEETS[name].map(function (h) {
    return obj[h] !== undefined && obj[h] !== null ? obj[h] : '';
  });
  sheet(name).appendRow(row);
}

/** Batch append — one setValues call instead of N appendRow round-trips. */
function appendRows(name, objs) {
  if (!objs.length) return;
  var sh = sheet(name);
  var headers = SHEETS[name];
  var values = objs.map(function (obj) {
    return headers.map(function (h) {
      return obj[h] !== undefined && obj[h] !== null ? obj[h] : '';
    });
  });
  sh.getRange(sh.getLastRow() + 1, 1, values.length, headers.length).setValues(values);
}

/** Writes only the keys present in patch. Identity columns are never patchable. */
function patchRowAt(name, rowIndex, patch) {
  var sh = sheet(name);
  var headers = SHEETS[name];
  for (var c = 0; c < headers.length; c++) {
    var h = headers[c];
    if (h === 'id' || h === 'user_id' || h === 'debt_id' || h === 'bill_id') continue;
    if (!Object.prototype.hasOwnProperty.call(patch, h)) continue;
    var v = patch[h];
    sh.getRange(rowIndex, c + 1).setValue(v === undefined || v === null ? '' : v);
  }
  // No read-back: callers are all RETURNS_DATA actions, so doPost reads the
  // whole dataset once instead of re-reading this sheet here.
  return null;
}

/**
 * JSON.stringify drops undefined, so a "clear the paid flag" patch arrives
 * without paid_date / paid_amount. Clear them explicitly, or the row would
 * keep a stale payment date next to paid = false.
 */
function normalizePaidPatch(patch) {
  if (Object.prototype.hasOwnProperty.call(patch, 'paid') && !bool(patch.paid)) {
    patch.paid = false;
    patch.paid_date = '';
    patch.paid_amount = '';
  }
  return patch;
}

/** Deletes bottom-up so earlier row indices stay valid as rows are removed. */
function deleteRowsWhere(name, col, value) {
  var sh = sheet(name);
  var last = sh.getLastRow();
  if (last < 2) return;
  var colIdx = SHEETS[name].indexOf(col);
  // Only the matched column is read, not the whole grid.
  var vals = sh.getRange(2, colIdx + 1, last - 1, 1).getValues();
  // Bottom-up so earlier row indices stay valid as rows are removed.
  for (var i = vals.length - 1; i >= 0; i--) {
    if (num(vals[i][0]) === num(value)) sh.deleteRow(i + 2);
  }
}

/** Reads only the id column, not every column of every row. */
function idColumn(name) {
  var sh = sheet(name);
  var last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, 1).getValues();
}

function nextId(name) {
  var ids = idColumn(name);
  var max = 0;
  for (var i = 0; i < ids.length; i++) { var id = num(ids[i][0]); if (id > max) max = id; }
  return max + 1;
}

/** 1-based sheet row for an id, or -1. Reads only the id column. */
function findSheetRow(name, id) {
  var ids = idColumn(name);
  for (var i = 0; i < ids.length; i++) if (num(ids[i][0]) === num(id)) return i + 2;
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

/** Rows of `name` belonging to this user. */
function readOwnedRows(name, uid) {
  var rows = readRows(name);
  var out = [];
  for (var i = 0; i < rows.length; i++) {
    if (num(rows[i].user_id) === num(uid)) out.push(rows[i]);
  }
  return out;
}

/**
 * 1-based sheet row for a row the caller owns. Throws 'not found' when the row
 * is missing OR belongs to someone else — identical either way, so ids cannot be
 * probed for existence.
 *
 * Reads only the id and user_id columns, which are always the first two on owned
 * sheets, and returns the location so callers do not look the row up a second
 * time.
 */
function ownedRowIndex(name, id, uid) {
  var sh = sheet(name);
  var last = sh.getLastRow();
  if (last >= 2) {
    var vals = sh.getRange(2, 1, last - 1, 2).getValues();
    for (var i = 0; i < vals.length; i++) {
      if (num(vals[i][0]) === num(id)) {
        if (num(vals[i][1]) !== num(uid)) throw new Error('not found');
        return i + 2;
      }
    }
  }
  throw new Error('not found');
}

/** Ownership check where the row's position is not needed. */
function assertOwned(name, id, uid) {
  ownedRowIndex(name, id, uid);
}

function getAll(uid) {
  var data = {};
  DATA_SHEETS.forEach(function (name) {
    // Inactive sheets are reported as empty rather than read — see ACTIVE_SHEETS.
    if (ACTIVE_SHEETS.indexOf(name) === -1) { data[name] = []; return; }
    data[name] = readOwnedRows(name, uid).map(function (r) { return coerce(name, r); });
  });
  var user = userById(uid);
  data.settings = { currency: user ? user.currency : 'PHP' };
  return data;
}

/*
 * Every sheet served here is per-user: its second column is user_id and its
 * handlers go through readOwnedRows / assertOwned. The income, savings_ledger
 * and allocation sheets exist but have no actions yet; each module ticket adds
 * its own. Anything added here without an ownership check would let any
 * authenticated user read and write another user's rows.
 */
function dispatch(action, p, uid) {
  switch (action) {
    case 'getAll': return getAll(uid);
    case 'addDebt': return addDebt(p, uid);
    case 'updateDebt': return updateDebt(p, uid);
    case 'deleteDebt': return deleteDebt(p, uid);
    case 'addScheduleRow': return addChildRow('debt_schedule', p, uid);
    case 'updateScheduleRow': return updateChildRow('debt_schedule', p, uid);
    case 'deleteScheduleRow': return deleteChildRow('debt_schedule', p, uid);
    case 'addStatement': return addChildRow('debt_statements', p, uid);
    case 'updateStatement': return updateChildRow('debt_statements', p, uid);
    case 'deleteStatement': return deleteChildRow('debt_statements', p, uid);
    case 'addBill': return addBill(p, uid);
    case 'updateBill': return updateBill(p, uid);
    case 'closeBill': return closeBill(p, uid);
    case 'deleteBill': return deleteBill(p, uid);
    case 'updateBillPayable': return updateBillPayable(p, uid);
    case 'deleteBillPayable': return deleteBillPayable(p, uid);
    case 'payBillPayable': return payBillPayable(p, uid);
    case 'setCurrency': return setCurrency(p, uid);
    default: throw new Error('Unknown action: ' + action);
  }
}

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

  return null; // RETURNS_DATA action — doPost reads the dataset back
}

function updateDebt(p, uid) {
  var rowIndex = ownedRowIndex('debts', p.id, uid);
  sheet('debts').getRange(rowIndex, SHEETS.debts.indexOf('name') + 1).setValue(p.patch.name);
  return null;
}

function deleteDebt(p, uid) {
  var rowIndex = ownedRowIndex('debts', p.id, uid);
  deleteRowsWhere('debt_schedule', 'debt_id', p.id);
  deleteRowsWhere('debt_statements', 'debt_id', p.id);
  sheet('debts').deleteRow(rowIndex);
  return null;
}

function addChildRow(name, p, uid) {
  assertOwned('debts', p.debtId, uid); // the parent debt must be yours
  var row = {};
  for (var k in p.input) if (Object.prototype.hasOwnProperty.call(p.input, k)) row[k] = p.input[k];
  row.id = nextId(name);
  row.user_id = uid;
  row.debt_id = p.debtId;
  appendRow(name, row);
  return null;
}

function updateChildRow(name, p, uid) {
  var rowIndex = ownedRowIndex(name, p.id, uid);
  return patchRowAt(name, rowIndex, normalizePaidPatch(p.patch));
}

function deleteChildRow(name, p, uid) {
  sheet(name).deleteRow(ownedRowIndex(name, p.id, uid));
  return null;
}

/**
 * The caller's own bill, refused when closed. Every bill write goes through
 * here: the frontend hides the actions on a closed bill, but a stale tab must
 * not be able to slip one past.
 */
function openBill(id, uid) {
  // Returns the row's position too, so a caller that goes on to patch it does
  // not look the same row up a second time — the pattern ownedRowIndex exists for.
  var rowIndex = ownedRowIndex('bills', id, uid);
  var bill = getById('bills', id);
  if (!bill) throw new Error('not found');
  if (bill.closed) throw new Error('That bill is closed.');
  return { bill: bill, rowIndex: rowIndex };
}

/** A payable's sheet row and coerced values, plus its parent bill — all checked. */
function ownedPayable(id, uid) {
  var rowIndex = ownedRowIndex('bill_payables', id, uid);
  var row = getById('bill_payables', id);
  return { rowIndex: rowIndex, row: row, bill: openBill(row.bill_id, uid).bill };
}

/** The payable a new bill or a payment starts from. */
function newPayable(bill, uid, dueDate) {
  return {
    id: nextId('bill_payables'),
    user_id: uid,
    bill_id: bill.id,
    due_date: dueDate,
    // Blank for a variable bill: its figure is unknown until the statement
    // arrives, and blank coerces back to undefined rather than to zero.
    amount: bill.type === 'fixed' && bill.amount !== undefined && bill.amount !== null ? bill.amount : '',
    paid: false
  };
}

function addBill(p, uid) {
  var bill = {
    id: nextId('bills'),
    user_id: uid,
    name: p.name,
    type: p.type,
    frequency: p.frequency,
    amount: blank(p.amount) ? '' : p.amount,
    day: p.day,
    second_day: blank(p.second_day) ? '' : p.second_day,
    month: blank(p.month) ? '' : p.month,
    closed: false
  };
  appendRow('bills', bill);
  appendRow('bill_payables', newPayable({ id: bill.id, type: p.type, amount: p.amount }, uid, p.first_due_date));
  return null; // RETURNS_DATA action — doPost reads the dataset back
}

/**
 * JSON.stringify drops undefined, so a patch that clears an optional field
 * arrives without it. Blank those explicitly, or the row would keep a value
 * from the shape it had before — a monthly bill holding the second_day of the
 * bi-monthly schedule it used to be.
 */
function normalizeBillPatch(patch) {
  var optional = ['amount', 'second_day', 'month'];
  for (var i = 0; i < optional.length; i++) {
    if (!Object.prototype.hasOwnProperty.call(patch, optional[i])) patch[optional[i]] = '';
  }
  return patch;
}

function updateBill(p, uid) {
  var found = openBill(p.id, uid);
  return patchRowAt('bills', found.rowIndex, normalizeBillPatch(p.patch || {}));
}

function closeBill(p, uid) {
  openBill(p.id, uid);
  deleteUnpaidPayables(p.id);
  setCell('bills', p.id, 'closed', true);
  return null;
}

/**
 * Deletes this bill's unpaid payables, optionally sparing one. Deletes bottom-up
 * so earlier row indices stay valid as rows are removed.
 *
 * Pass exceptId when undoing a payment: the row being unpaid must survive while
 * the payable that payment minted goes. Closing a bill spares nothing.
 */
function deleteUnpaidPayables(billId, exceptId) {
  var sh = sheet('bill_payables');
  var last = sh.getLastRow();
  if (last < 2) return;
  var headers = SHEETS.bill_payables;
  var vals = sh.getRange(2, 1, last - 1, headers.length).getValues();
  var idCol = headers.indexOf('id');
  var billCol = headers.indexOf('bill_id');
  var paidCol = headers.indexOf('paid');
  for (var i = vals.length - 1; i >= 0; i--) {
    if (num(vals[i][billCol]) !== num(billId)) continue;
    if (exceptId !== undefined && num(vals[i][idCol]) === num(exceptId)) continue;
    if (!bool(vals[i][paidCol])) sh.deleteRow(i + 2);
  }
}

function deleteBill(p, uid) {
  var rowIndex = ownedRowIndex('bills', p.id, uid);
  deleteRowsWhere('bill_payables', 'bill_id', p.id);
  sheet('bills').deleteRow(rowIndex);
  return null;
}

function updateBillPayable(p, uid) {
  var found = ownedPayable(p.id, uid);
  var patch = normalizePaidPatch(p.patch || {});
  // An omitted amount means "not set yet" — clear the cell rather than keep the
  // figure that was there.
  if (!Object.prototype.hasOwnProperty.call(patch, 'amount')) patch.amount = '';
  /*
   * Undoing a payment un-mints the payable that payment created — the inverse of
   * the mint in payBillPayable.
   *
   * Decided before the patch, which is what makes "was this row paid" answerable.
   * The paid key must be present AND false: an omitted paid means "leave it
   * alone", and reading that as false would un-mint on a patch that only set an
   * amount.
   */
  var unpaying = Object.prototype.hasOwnProperty.call(patch, 'paid') && !bool(patch.paid);
  var unmint = bool(found.row.paid) && unpaying && isLatestPaidPayable(found.bill.id, found.row);
  // Patch first, so found.rowIndex is still valid when it is used — the deletion
  // shifts indices, and nothing may rely on that index afterwards.
  var result = patchRowAt('bill_payables', found.rowIndex, patch);
  if (unmint) deleteUnpaidPayables(found.bill.id, found.row.id);
  return result;
}

function deleteBillPayable(p, uid) {
  var found = ownedPayable(p.id, uid);
  sheet('bill_payables').deleteRow(found.rowIndex);
  return null;
}

/**
 * Whether this paid payable is the most recent paid one for its bill, and so the
 * one whose payment minted the payable now open.
 *
 * Only that payment has something to un-mint. An older one minted the payable
 * that has since been paid itself, so undoing it must leave the open payable
 * alone — deleting it would discard a figure the user entered, and would let the
 * re-payment mint a duplicate of a month already paid.
 *
 * Compared by due date, which is ISO and so orders lexicographically.
 */
function isLatestPaidPayable(billId, payable) {
  var rows = readRows('bill_payables');
  var due = fmtDate(payable.due_date);
  for (var i = 0; i < rows.length; i++) {
    if (num(rows[i].bill_id) !== num(billId)) continue;
    if (num(rows[i].id) === num(payable.id)) continue;
    if (!bool(rows[i].paid)) continue;
    if (fmtDate(rows[i].due_date) > due) return false;
  }
  return true;
}

/** Whether this bill has an unpaid payable other than `exceptId`. */
function hasOtherUnpaidPayable(billId, exceptId) {
  var rows = readRows('bill_payables');
  for (var i = 0; i < rows.length; i++) {
    if (num(rows[i].bill_id) !== num(billId)) continue;
    if (num(rows[i].id) === num(exceptId)) continue;
    if (!bool(rows[i].paid)) return true;
  }
  return false;
}

function payBillPayable(p, uid) {
  var found = ownedPayable(p.id, uid);
  var input = p.input || {};
  patchRowAt('bill_payables', found.rowIndex, {
    paid: true,
    paid_date: input.paid_date,
    paid_amount: input.paid_amount
  });
  // Mint the next payable only when nothing else is outstanding, so a
  // double-submitted Pay cannot leave two competing upcoming rows.
  if (!hasOtherUnpaidPayable(found.bill.id, found.row.id)) {
    appendRow('bill_payables', newPayable(found.bill, uid, input.next_due_date));
  }
  return null;
}

function setCurrency(p, uid) {
  setCell('users', uid, 'currency', p.currency);
  return null;
}

