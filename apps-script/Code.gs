// Finance Tracker — Google Apps Script web app backend.
// Bind this script to the Google Sheet that holds the data sheets, paste CLIENT_ID,
// then Deploy > New deployment > Web app (Execute as: Me, Access: Anyone).
// Full steps: docs/superpowers/guides/apps-script-setup.md

var CLIENT_ID = 'PASTE_YOUR_OAUTH_WEB_CLIENT_ID_HERE';

var SHEETS = {
  funds: ['id', 'source', 'amount', 'date', 'notes'],
  bills: ['id', 'name', 'amount', 'due_date', 'paid', 'notes'],
  expendable: ['id', 'month', 'daily_amount', 'date', 'notes'],
  debts: ['id', 'name', 'type'],
  debt_schedule: ['id', 'debt_id', 'due_date', 'amount', 'paid', 'paid_date', 'paid_amount'],
  debt_statements: ['id', 'debt_id', 'due_date', 'min_due', 'total_due', 'outstanding', 'paid', 'paid_date', 'paid_amount'],
  savings: ['id', 'date', 'amount', 'source', 'total', 'notes'],
  savings_transfers: ['id', 'date', 'amount', 'notes'],
  settings: ['key', 'value']
};

var DATA_SHEETS = ['funds', 'bills', 'expendable', 'debts', 'debt_schedule', 'debt_statements', 'savings', 'savings_transfers'];

function doGet() {
  return json({ data: 'finance api ok' });
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);

    // Identity is checked before anything touches the spreadsheet, so an
    // anonymous caller can never trigger sheet creation.
    var email = verify(body.token);
    if (!email) return json({ error: 'unauthorized' });

    ensureSheets();

    var allowed = readSettings().allowedEmails;
    // The whitelist is the security boundary, so it is never auto-populated:
    // seeding the first caller would hand the data to whoever arrived first.
    if (allowed.length === 0) {
      return json({
        error:
          'This backend has no allowed users yet. In the settings sheet, add a row with key "allowed_email" and your Google address as the value, then reload.'
      });
    }
    if (allowed.indexOf(email) === -1) return json({ error: 'unauthorized' });

    return json({ data: dispatch(body.action, body.payload) });
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
  var spreadsheet = ss();
  for (var name in SHEETS) {
    if (!Object.prototype.hasOwnProperty.call(SHEETS, name)) continue;
    var sh = spreadsheet.getSheetByName(name);
    if (!sh) {
      sh = spreadsheet.insertSheet(name);
    } else if (sh.getLastRow() > 0) {
      continue; // already has content, including its header row
    }
    sh.getRange(1, 1, 1, SHEETS[name].length).setValues([SHEETS[name]]);
    sh.setFrozenRows(1);
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
    if (h === 'id' || h === 'debt_id') continue;
    if (!Object.prototype.hasOwnProperty.call(patch, h)) continue;
    var v = patch[h];
    sh.getRange(rowIndex, c + 1).setValue(v === undefined || v === null ? '' : v);
  }
  return getById(name, id);
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
  var values = sh.getDataRange().getValues();
  var colIdx = SHEETS[name].indexOf(col);
  for (var i = values.length - 1; i >= 1; i--) {
    if (num(values[i][colIdx]) === num(value)) sh.deleteRow(i + 1);
  }
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
  var currency = 'PHP';
  for (var i = 0; i < rows.length; i++) {
    var k = String(rows[i].key);
    var v = rows[i].value;
    if (k.indexOf('budget_') === 0) monthlyBudgets[k.substring(7)] = num(v);
    else if (k === 'allowed_email' && v) allowedEmails.push(String(v));
    else if (k === 'currency' && v) currency = String(v);
  }
  return { monthlyBudgets: monthlyBudgets, allowedEmails: allowedEmails, currency: currency };
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
    case 'updateDebt': return updateDebt(p);
    case 'deleteDebt': return deleteDebt(p);
    case 'addScheduleRow': return addChildRow('debt_schedule', p);
    case 'updateScheduleRow': return updateChildRow('debt_schedule', p);
    case 'deleteScheduleRow': return deleteChildRow('debt_schedule', p);
    case 'addStatement': return addChildRow('debt_statements', p);
    case 'updateStatement': return updateChildRow('debt_statements', p);
    case 'deleteStatement': return deleteChildRow('debt_statements', p);
    case 'setCurrency': return upsertSetting('currency', p.currency);
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

function addDebt(p) {
  var debt = { id: nextId('debts'), name: p.name, type: p.type };
  appendRow('debts', debt);

  var target = p.type === 'fixed' ? 'debt_schedule' : 'debt_statements';
  var rows = p.rows || [];
  var baseId = nextId(target);
  var prepared = rows.map(function (row, i) {
    var copy = {};
    for (var k in row) if (Object.prototype.hasOwnProperty.call(row, k)) copy[k] = row[k];
    copy.id = baseId + i;
    copy.debt_id = debt.id;
    return copy;
  });
  appendRows(target, prepared);

  return coerce('debts', debt);
}

function updateDebt(p) {
  setCell('debts', p.id, 'name', p.patch.name);
  return getById('debts', p.id);
}

function deleteDebt(p) {
  deleteRowsWhere('debt_schedule', 'debt_id', p.id);
  deleteRowsWhere('debt_statements', 'debt_id', p.id);
  deleteRowById('debts', p.id);
  return null;
}

function addChildRow(name, p) {
  var row = {};
  for (var k in p.input) if (Object.prototype.hasOwnProperty.call(p.input, k)) row[k] = p.input[k];
  row.id = nextId(name);
  row.debt_id = p.debtId;
  appendRow(name, row);
  return coerce(name, row);
}

function updateChildRow(name, p) {
  return patchRow(name, p.id, normalizePaidPatch(p.patch));
}

function deleteChildRow(name, p) {
  deleteRowById(name, p.id);
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
