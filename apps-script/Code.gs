// Finance Tracker — Google Apps Script web app backend.
// Bind this script to the Google Sheet that holds the data sheets, then
// Deploy > New deployment > Web app (Execute as: Me, Access: Anyone).
// Secrets are generated automatically on first use; nothing to paste here.
// Full steps: docs/superpowers/guides/apps-script-setup.md

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

/**
 * Bump this whenever a sheet's columns change. It busts the ensureSheets cache
 * so the new shape is applied on the very next request after a deployment,
 * instead of up to an hour later.
 */
var SCHEMA_VERSION = 2;

var DATA_SHEETS = ['funds', 'bills', 'expendable', 'debts', 'debt_schedule', 'debt_statements', 'savings', 'savings_transfers'];

/**
 * Sheets getAll actually reads. Every sheet read is a separate round trip, so
 * reading the ones no screen displays is pure latency.
 *
 * IMPORTANT: if you re-enable Funds, Bills, Expendable or Savings in the
 * frontend, add their sheet names here. Otherwise those pages render empty even
 * though the rows exist.
 */
var ACTIVE_SHEETS = ['debts', 'debt_schedule', 'debt_statements'];

/** Actions that return the full dataset instead of the affected row. */
var RETURNS_DATA = {
  addDebt: true, updateDebt: true, deleteDebt: true,
  addScheduleRow: true, updateScheduleRow: true, deleteScheduleRow: true,
  addStatement: true, updateStatement: true, deleteStatement: true,
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
  // Confirming nine tabs on every request adds up, so the result is cached.
  // The key carries SCHEMA_VERSION, so a deployment that changes columns
  // re-checks immediately rather than waiting for the cache to expire.
  var cache = CacheService.getScriptCache();
  var readyKey = 'sheets_ready_v' + SCHEMA_VERSION;
  if (cache.get(readyKey)) return;

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

    // Stale shape. The old tab is RENAMED, never deleted: this runs
    // automatically, and automatic data loss is not an acceptable trade for
    // saving a manual step. The archived tab stays alongside for inspection.
    sh.setName(name + '_old_' + timestampSuffix());
    writeHeaders(spreadsheet.insertSheet(name), name);
  }
  cache.put(readyKey, '1', 3600);
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

function timestampSuffix() {
  return Utilities.formatDate(new Date(), ss().getSpreadsheetTimeZone(), 'yyyyMMdd-HHmmss');
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

/**
 * Returns false once more than `max` attempts happen inside the window. The
 * /exec endpoint is public, so login needs this.
 */
function rateLimit(key, max, seconds) {
  var cache = CacheService.getScriptCache();
  var k = 'rl_' + key;
  var n = Number(cache.get(k) || 0) + 1;
  cache.put(k, String(n), seconds);
  return n <= max;
}

function normalizeUsername(u) { return String(u || '').trim().toLowerCase(); }

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

function login(p) {
  var username = normalizeUsername(p.username);
  if (!rateLimit('login_' + username, 5, 60)) {
    return { error: 'Too many attempts. Wait a minute and try again.' };
  }
  var user = findUserByUsername(username);
  // Identical message whether the user is missing or the password is wrong, so
  // this cannot be used to discover which usernames exist.
  if (!user) return { error: 'Wrong username or password.' };
  if (!constantTimeEquals(user.pw_hash, hashCredential(p.derived))) {
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
  if (name === 'debts') return { id: num(r.id), name: String(r.name), type: String(r.type) };
  if (name === 'debt_schedule') return {
    id: num(r.id), debt_id: num(r.debt_id), due_date: fmtDate(r.due_date), amount: num(r.amount),
    paid: bool(r.paid), paid_date: optDate(r.paid_date), paid_amount: optNum(r.paid_amount)
  };
  if (name === 'debt_statements') return {
    id: num(r.id), debt_id: num(r.debt_id), due_date: fmtDate(r.due_date),
    min_due: num(r.min_due), total_due: num(r.total_due), outstanding: num(r.outstanding),
    paid: bool(r.paid), paid_date: optDate(r.paid_date), paid_amount: optNum(r.paid_amount)
  };
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

/** Writes only the keys present in patch. id and debt_id are never patchable. */
function patchRow(name, id, patch) {
  var rowIndex = findSheetRow(name, id);
  if (rowIndex === -1) throw new Error(name + ' ' + id + ' not found');
  var sh = sheet(name);
  var headers = SHEETS[name];
  for (var c = 0; c < headers.length; c++) {
    var h = headers[c];
    if (h === 'id' || h === 'user_id' || h === 'debt_id') continue;
    if (!Object.prototype.hasOwnProperty.call(patch, h)) continue;
    var v = patch[h];
    sh.getRange(rowIndex, c + 1).setValue(v === undefined || v === null ? '' : v);
  }
  // No read-back: callers of this are all RETURNS_DATA actions, so doPost reads
  // the whole dataset once instead of re-reading this sheet here.
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

function deleteRowById(name, id) {
  var rowIndex = findSheetRow(name, id);
  if (rowIndex !== -1) sheet(name).deleteRow(rowIndex);
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

function settingValue(key) {
  var rows = readRows('settings');
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].key) === key) return String(rows[i].value);
  }
  return '';
}

/** Global settings only. Currency is per-user and attached by getAll. */
function readSettings() {
  var rows = readRows('settings');
  var monthlyBudgets = {};
  for (var i = 0; i < rows.length; i++) {
    var k = String(rows[i].key);
    if (k.indexOf('budget_') === 0) monthlyBudgets[k.substring(7)] = num(rows[i].value);
  }
  return { monthlyBudgets: monthlyBudgets };
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
 * Throws 'not found' when the row is missing OR owned by someone else —
 * identical either way, so ids cannot be probed for existence.
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

/** Inserts or updates a single key in the settings sheet. */
function upsertSetting(key, value) {
  var sh = sheet('settings');
  var values = sh.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][0]) === key) {
      sh.getRange(i + 1, 2).setValue(value);
      return null;
    }
  }
  sh.appendRow([key, value]);
  return null;
}

function getAll(uid) {
  var data = {};
  DATA_SHEETS.forEach(function (name) {
    // Inactive sheets are reported as empty rather than read — see ACTIVE_SHEETS.
    if (ACTIVE_SHEETS.indexOf(name) === -1) { data[name] = []; return; }
    data[name] = readOwnedRows(name, uid).map(function (r) { return coerce(name, r); });
  });
  var user = userById(uid);
  data.settings = readSettings();
  data.settings.currency = user ? user.currency : 'PHP';
  return data;
}

function dispatch(action, p, uid) {
  switch (action) {
    case 'getAll': return getAll(uid);
    case 'addFund': return addFund(p);
    case 'addBill': return addBill(p);
    case 'setBillPaid': return setBillPaid(p);
    case 'addExpendable': return addExpendable(p);
    case 'setMonthlyBudget': return setMonthlyBudget(p);
    case 'addDebt': return addDebt(p, uid);
    case 'updateDebt': return updateDebt(p, uid);
    case 'deleteDebt': return deleteDebt(p, uid);
    case 'addScheduleRow': return addChildRow('debt_schedule', p, uid);
    case 'updateScheduleRow': return updateChildRow('debt_schedule', p, uid);
    case 'deleteScheduleRow': return deleteChildRow('debt_schedule', p, uid);
    case 'addStatement': return addChildRow('debt_statements', p, uid);
    case 'updateStatement': return updateChildRow('debt_statements', p, uid);
    case 'deleteStatement': return deleteChildRow('debt_statements', p, uid);
    case 'setCurrency': return setCurrency(p, uid);
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
  return upsertSetting('budget_' + p.month, p.amount);
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
