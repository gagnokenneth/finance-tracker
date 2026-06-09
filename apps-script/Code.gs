// Finance Tracker — Google Apps Script web app backend.
// Bind this script to the Google Sheet that holds the data sheets, paste CLIENT_ID,
// then Deploy > New deployment > Web app (Execute as: Me, Access: Anyone).
// Full steps: docs/superpowers/guides/apps-script-setup.md

var CLIENT_ID = 'PASTE_YOUR_OAUTH_WEB_CLIENT_ID_HERE';

var SHEETS = {
  funds: ['id', 'source', 'amount', 'date', 'notes'],
  bills: ['id', 'name', 'amount', 'due_date', 'paid', 'notes'],
  expendable: ['id', 'month', 'daily_amount', 'date', 'notes'],
  debts: ['id', 'name', 'total_amount', 'remaining', 'type', 'interest_rate', 'notes'],
  debt_payments: ['id', 'debt_id', 'amount_paid', 'date', 'notes'],
  savings: ['id', 'date', 'amount', 'source', 'total', 'notes'],
  savings_transfers: ['id', 'date', 'amount', 'notes'],
  settings: ['key', 'value']
};

var DATA_SHEETS = ['funds', 'bills', 'expendable', 'debts', 'debt_payments', 'savings', 'savings_transfers'];

function doGet() {
  return json({ data: 'finance api ok' });
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var email = verify(body.token);
    if (!email || !isAllowed(email)) return json({ error: 'unauthorized' });
    return json({ data: dispatch(body.action, body.payload) });
  } catch (err) {
    return json({ error: String((err && err.message) || err) });
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

function isAllowed(email) {
  return readSettings().allowedEmails.indexOf(email) !== -1;
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
  if (name === 'debts') return { id: num(r.id), name: String(r.name), total_amount: num(r.total_amount), remaining: num(r.remaining), type: String(r.type), interest_rate: num(r.interest_rate), notes: r.notes ? String(r.notes) : undefined };
  if (name === 'debt_payments') return { id: num(r.id), debt_id: num(r.debt_id), amount_paid: num(r.amount_paid), date: fmtDate(r.date), notes: r.notes ? String(r.notes) : undefined };
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
  for (var i = 0; i < rows.length; i++) {
    var k = String(rows[i].key);
    var v = rows[i].value;
    if (k.indexOf('budget_') === 0) monthlyBudgets[k.substring(7)] = num(v);
    else if (k === 'allowed_email' && v) allowedEmails.push(String(v));
  }
  return { monthlyBudgets: monthlyBudgets, allowedEmails: allowedEmails };
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
    case 'payDebt': return payDebt(p);
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
  var key = 'budget_' + p.month;
  var values = sheet('settings').getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][0]) === key) {
      sheet('settings').getRange(i + 1, 2).setValue(p.amount);
      return null;
    }
  }
  sheet('settings').appendRow([key, p.amount]);
  return null;
}

function addDebt(p) {
  var debt = {
    id: nextId('debts'), name: p.name, total_amount: p.total_amount, remaining: p.remaining,
    type: p.type, interest_rate: p.interest_rate, notes: p.notes || ''
  };
  appendRow('debts', debt);
  return coerce('debts', debt);
}

function payDebt(p) {
  var payment = { id: nextId('debt_payments'), debt_id: p.debt_id, amount_paid: p.amount_paid, date: p.date, notes: p.notes || '' };
  appendRow('debt_payments', payment);
  var debt = getById('debts', p.debt_id);
  if (!debt) throw new Error('Debt not found');
  var newRemaining = debt.remaining - num(p.amount_paid);
  setCell('debts', p.debt_id, 'remaining', newRemaining);
  debt.remaining = newRemaining;
  return { payment: coerce('debt_payments', payment), debt: debt };
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
