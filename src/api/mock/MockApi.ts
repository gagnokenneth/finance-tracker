import type {
  FinanceApi,
  NewFund,
  NewBill,
  BillPatch,
  BillPayablePatch,
  PayBillInput,
  NewExpendable,
  NewDebt,
  NewScheduleRow,
  NewStatement,
  ScheduleRowPatch,
  StatementPatch,
  NewSavings,
  NewSavingsTransfer,
  AuthResult,
  SignupInput,
  LoginInput,
} from '../FinanceApi.ts'
import type {
  FinanceData,
  FundEntry,
  Bill,
  BillPayable,
  ExpendableEntry,
  Debt,
  DebtScheduleRow,
  DebtStatement,
  SavingsEntry,
  SavingsTransfer,
  Currency,
} from '../../types.ts'
import { createSeed } from './seed.ts'
import { readToken, decodeSession } from '../../auth/session.ts'
import { normalizeUsername, isValidUsername, USERNAME_RULE } from '../../auth/password.ts'

const KEY = 'finance-mock-db'

interface MockUser {
  id: number
  username: string
  /** The client-derived value, stored as-is. Mock only — no server pepper here. */
  pw_hash: string
}

/** One FinanceData blob per user id, so isolation comes for free. */
interface MockDb {
  users: MockUser[]
  data: Record<string, FinanceData>
}

function nextId<T extends { id: number }>(rows: T[]): number {
  return rows.reduce((max, r) => Math.max(max, r.id), 0) + 1
}

/**
 * An unpaid row must not keep a payment date. Cleared explicitly rather than
 * relying on JSON dropping undefined, so both adapters behave the same way.
 */
function clearPaidFields(row: DebtScheduleRow | DebtStatement | BillPayable): void {
  if (!row.paid) {
    delete row.paid_date
    delete row.paid_amount
  }
}

function mockToken(user: MockUser): string {
  // Same two-part shape the real backend produces, so decodeSession works
  // unchanged. The signature part is a placeholder: mock does not verify.
  const payload = btoa(JSON.stringify({ uid: user.id, username: user.username }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
  return `${payload}.mock`
}

export class MockApi implements FinanceApi {
  private loadDb(): MockDb {
    const raw = localStorage.getItem(KEY)
    // Fields are backfilled rather than trusted: this database is persisted JSON
    // that outlives code changes, so a browser holding an older shape must not
    // crash on a field added later.
    const stored = raw ? (JSON.parse(raw) as Partial<MockDb>) : null
    const db: MockDb = { users: stored?.users ?? [], data: stored?.data ?? {} }
    if (!raw) this.saveDb(db)
    return db
  }

  private saveDb(db: MockDb): void {
    localStorage.setItem(KEY, JSON.stringify(db))
  }

  /** The signed-in user's id, from the same token store the real adapter uses. */
  private uid(): string {
    const session = decodeSession(readToken())
    if (!session) throw new Error('unauthorized')
    return String(session.id)
  }

  private load(): FinanceData {
    const db = this.loadDb()
    const key = this.uid()
    const data = db.data[key]
    if (!data) throw new Error('unauthorized')
    // Backfilled for the same reason loadDb backfills its own fields: this blob
    // is persisted JSON that outlives code changes, and a browser holding the
    // shape from before bill_payables existed must not crash on it.
    data.bill_payables ??= []
    return data
  }

  private save(data: FinanceData): void {
    const db = this.loadDb()
    db.data[this.uid()] = data
    this.saveDb(db)
  }

  // Simulate a little latency so loading states are exercised in the UI.
  private async delay<T>(value: T): Promise<T> {
    await new Promise((r) => setTimeout(r, 80))
    return value
  }

  async signup(input: SignupInput): Promise<AuthResult> {
    const db = this.loadDb()
    const username = normalizeUsername(input.username)
    // Mock mode takes no invite code — local development should not need one.
    // The live backend still requires and burns a real code.
    if (!isValidUsername(username)) throw new Error(`Use ${USERNAME_RULE}`)
    if (db.users.some((u) => u.username === username)) throw new Error('That username is taken.')

    const user: MockUser = { id: nextId(db.users), username, pw_hash: input.derived }
    db.users.push(user)
    db.data[String(user.id)] = createSeed()
    this.saveDb(db)
    return this.delay({ token: mockToken(user), user: { id: user.id, username } })
  }

  async login(input: LoginInput): Promise<AuthResult> {
    const db = this.loadDb()
    const username = normalizeUsername(input.username)
    const user = db.users.find((u) => u.username === username)
    // Same message either way, matching the backend.
    if (!user || user.pw_hash !== input.derived) throw new Error('Wrong username or password.')
    return this.delay({ token: mockToken(user), user: { id: user.id, username } })
  }

  async getAll(): Promise<FinanceData> {
    return this.delay(this.load())
  }

  async addFund(input: NewFund): Promise<FundEntry> {
    const data = this.load()
    const fund: FundEntry = { id: nextId(data.funds), ...input }
    data.funds.push(fund)
    this.save(data)
    return this.delay(fund)
  }

  async addBill(input: NewBill): Promise<FinanceData> {
    const data = this.load()
    const { first_due_date, ...fields } = input
    const bill: Bill = { id: nextId(data.bills), ...fields, closed: false }
    data.bills.push(bill)
    data.bill_payables.push(this.newPayable(data, bill, first_due_date))
    this.save(data)
    return this.delay(data)
  }

  /** The payable a new bill or a payment starts from. */
  private newPayable(data: FinanceData, bill: Bill, dueDate: string): BillPayable {
    return {
      id: nextId(data.bill_payables),
      bill_id: bill.id,
      due_date: dueDate,
      // A variable bill's payable has no figure yet; the user sets it when the
      // statement arrives.
      amount: bill.type === 'fixed' ? bill.amount : undefined,
      paid: false,
    }
  }

  /**
   * The bill, refused when closed. Every bill write goes through here: the
   * frontend hides the actions on a closed bill, but a stale tab must not be
   * able to slip one past. Code.gs applies the same rule.
   */
  private openBill(data: FinanceData, id: number): Bill {
    const bill = data.bills.find((b) => b.id === id)
    if (!bill) throw new Error(`Bill ${id} not found`)
    if (bill.closed) throw new Error('That bill is closed.')
    return bill
  }

  private payableBill(data: FinanceData, payableId: number): { bill: Bill; row: BillPayable } {
    const row = data.bill_payables.find((r) => r.id === payableId)
    if (!row) throw new Error(`Bill payable ${payableId} not found`)
    return { bill: this.openBill(data, row.bill_id), row }
  }

  async updateBill(id: number, patch: BillPatch): Promise<FinanceData> {
    const data = this.load()
    Object.assign(this.openBill(data, id), patch)
    this.save(data)
    return this.delay(data)
  }

  async closeBill(id: number): Promise<FinanceData> {
    const data = this.load()
    const bill = this.openBill(data, id)
    // The trailing unpaid payable would otherwise sit at the top of the detail
    // view forever, reading as a bill being neglected.
    data.bill_payables = data.bill_payables.filter((r) => r.bill_id !== id || r.paid)
    bill.closed = true
    this.save(data)
    return this.delay(data)
  }

  async deleteBill(id: number): Promise<FinanceData> {
    const data = this.load()
    data.bills = data.bills.filter((b) => b.id !== id)
    data.bill_payables = data.bill_payables.filter((r) => r.bill_id !== id)
    this.save(data)
    return this.delay(data)
  }

  async updateBillPayable(id: number, patch: BillPayablePatch): Promise<FinanceData> {
    const data = this.load()
    const { bill, row } = this.payableBill(data, id)
    /*
     * Undoing a payment un-mints the payable that payment created — the inverse
     * of the mint in payBillPayable. Code.gs applies the same rule.
     *
     * Decided before the patch, which is what makes "was this row paid"
     * answerable, and limited to the latest paid payable: only that payment has
     * an open payable to un-mint. See isLatestPaidPayable in Code.gs.
     */
    const unmint =
      row.paid &&
      patch.paid === false &&
      !data.bill_payables.some(
        (r) => r.bill_id === bill.id && r.id !== id && r.paid && r.due_date > row.due_date,
      )
    Object.assign(row, patch)
    clearPaidFields(row)
    if (unmint) {
      data.bill_payables = data.bill_payables.filter(
        (r) => r.id === id || r.bill_id !== bill.id || r.paid,
      )
    }
    this.save(data)
    return this.delay(data)
  }

  async deleteBillPayable(id: number): Promise<FinanceData> {
    const data = this.load()
    this.payableBill(data, id)
    data.bill_payables = data.bill_payables.filter((r) => r.id !== id)
    this.save(data)
    return this.delay(data)
  }

  async payBillPayable(id: number, input: PayBillInput): Promise<FinanceData> {
    const data = this.load()
    const { bill, row } = this.payableBill(data, id)
    row.paid = true
    row.paid_date = input.paid_date
    row.paid_amount = input.paid_amount
    // Mint the next payable only when nothing else is outstanding, so a
    // double-submitted Pay cannot leave two competing upcoming rows.
    const stillUnpaid = data.bill_payables.some((r) => r.bill_id === bill.id && !r.paid)
    if (!stillUnpaid) {
      data.bill_payables.push(this.newPayable(data, bill, input.next_due_date))
    }
    this.save(data)
    return this.delay(data)
  }

  async addExpendable(input: NewExpendable): Promise<ExpendableEntry> {
    const data = this.load()
    const entry: ExpendableEntry = { id: nextId(data.expendable), ...input }
    data.expendable.push(entry)
    this.save(data)
    return this.delay(entry)
  }

  async setMonthlyBudget(month: string, amount: number): Promise<void> {
    const data = this.load()
    data.settings.monthlyBudgets[month] = amount
    this.save(data)
    return this.delay(undefined)
  }

  async addDebt(input: NewDebt): Promise<FinanceData> {
    const data = this.load()
    const debt: Debt = { id: nextId(data.debts), name: input.name, type: input.type }
    data.debts.push(debt)
    if (input.type === 'fixed') {
      for (const row of input.rows) {
        data.debt_schedule.push({ id: nextId(data.debt_schedule), debt_id: debt.id, ...row })
      }
    } else {
      for (const row of input.rows) {
        data.debt_statements.push({ id: nextId(data.debt_statements), debt_id: debt.id, ...row })
      }
    }
    this.save(data)
    return this.delay(data)
  }

  async updateDebt(id: number, patch: { name: string }): Promise<FinanceData> {
    const data = this.load()
    const debt = data.debts.find((d) => d.id === id)
    if (!debt) throw new Error(`Debt ${id} not found`)
    debt.name = patch.name
    this.save(data)
    return this.delay(data)
  }

  async deleteDebt(id: number): Promise<FinanceData> {
    const data = this.load()
    data.debts = data.debts.filter((d) => d.id !== id)
    data.debt_schedule = data.debt_schedule.filter((r) => r.debt_id !== id)
    data.debt_statements = data.debt_statements.filter((r) => r.debt_id !== id)
    this.save(data)
    return this.delay(data)
  }

  async addScheduleRow(debtId: number, input: NewScheduleRow): Promise<FinanceData> {
    const data = this.load()
    data.debt_schedule.push({ id: nextId(data.debt_schedule), debt_id: debtId, ...input })
    this.save(data)
    return this.delay(data)
  }

  async updateScheduleRow(id: number, patch: ScheduleRowPatch): Promise<FinanceData> {
    const data = this.load()
    const row = data.debt_schedule.find((r) => r.id === id)
    if (!row) throw new Error(`Schedule row ${id} not found`)
    Object.assign(row, patch)
    clearPaidFields(row)
    this.save(data)
    return this.delay(data)
  }

  async deleteScheduleRow(id: number): Promise<FinanceData> {
    const data = this.load()
    data.debt_schedule = data.debt_schedule.filter((r) => r.id !== id)
    this.save(data)
    return this.delay(data)
  }

  async addStatement(debtId: number, input: NewStatement): Promise<FinanceData> {
    const data = this.load()
    data.debt_statements.push({ id: nextId(data.debt_statements), debt_id: debtId, ...input })
    this.save(data)
    return this.delay(data)
  }

  async updateStatement(id: number, patch: StatementPatch): Promise<FinanceData> {
    const data = this.load()
    const row = data.debt_statements.find((r) => r.id === id)
    if (!row) throw new Error(`Statement ${id} not found`)
    Object.assign(row, patch)
    // null is the wire's "clear this"; the stored model uses undefined.
    for (const key of ['min_due', 'total_due', 'outstanding'] as const) {
      if (patch[key] === null) row[key] = undefined
    }
    clearPaidFields(row)
    this.save(data)
    return this.delay(data)
  }

  async deleteStatement(id: number): Promise<FinanceData> {
    const data = this.load()
    data.debt_statements = data.debt_statements.filter((r) => r.id !== id)
    this.save(data)
    return this.delay(data)
  }

  async setCurrency(currency: Currency): Promise<void> {
    const data = this.load()
    data.settings.currency = currency
    this.save(data)
    await this.delay(null)
  }

  async addSavings(input: NewSavings): Promise<SavingsEntry> {
    const data = this.load()
    const priorTotal =
      data.savings.reduce((a, s) => a + s.amount, 0) -
      data.savings_transfers.reduce((a, t) => a + t.amount, 0)
    const entry: SavingsEntry = {
      id: nextId(data.savings),
      total: priorTotal + input.amount,
      ...input,
    }
    data.savings.push(entry)
    this.save(data)
    return this.delay(entry)
  }

  async transferSavingsToFunds(
    input: NewSavingsTransfer,
  ): Promise<{ transfer: SavingsTransfer; fund: FundEntry }> {
    const data = this.load()
    const transfer: SavingsTransfer = { id: nextId(data.savings_transfers), ...input }
    data.savings_transfers.push(transfer)
    const fund: FundEntry = {
      id: nextId(data.funds),
      source: 'Savings',
      amount: input.amount,
      date: input.date,
      notes: input.notes,
    }
    data.funds.push(fund)
    this.save(data)
    return this.delay({ transfer, fund })
  }
}
