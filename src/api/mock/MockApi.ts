import type {
  FinanceApi,
  NewFund,
  NewBill,
  NewExpendable,
  NewDebt,
  NewScheduleRow,
  NewStatement,
  ScheduleRowPatch,
  StatementPatch,
  NewSavings,
  NewSavingsTransfer,
} from '../FinanceApi.ts'
import type {
  FinanceData,
  FundEntry,
  Bill,
  ExpendableEntry,
  Debt,
  DebtScheduleRow,
  DebtStatement,
  SavingsEntry,
  SavingsTransfer,
  Currency,
} from '../../types.ts'
import { createSeed } from './seed.ts'

const KEY = 'finance-mock-db'

function nextId<T extends { id: number }>(rows: T[]): number {
  return rows.reduce((max, r) => Math.max(max, r.id), 0) + 1
}

/**
 * An unpaid row must not keep a payment date. Cleared explicitly rather than
 * relying on JSON dropping undefined, so both adapters behave the same way.
 */
function clearPaidFields(row: DebtScheduleRow | DebtStatement): void {
  if (!row.paid) {
    delete row.paid_date
    delete row.paid_amount
  }
}

export class MockApi implements FinanceApi {
  private load(): FinanceData {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as FinanceData
    const seed = createSeed()
    this.save(seed)
    return seed
  }

  private save(data: FinanceData): void {
    localStorage.setItem(KEY, JSON.stringify(data))
  }

  // Simulate a little latency so loading states are exercised in the UI.
  private async delay<T>(value: T): Promise<T> {
    await new Promise((r) => setTimeout(r, 80))
    return value
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

  async addBill(input: NewBill): Promise<Bill> {
    const data = this.load()
    const bill: Bill = { id: nextId(data.bills), ...input }
    data.bills.push(bill)
    this.save(data)
    return this.delay(bill)
  }

  async setBillPaid(id: number, paid: boolean): Promise<Bill> {
    const data = this.load()
    const bill = data.bills.find((b) => b.id === id)
    if (!bill) throw new Error(`Bill ${id} not found`)
    bill.paid = paid
    this.save(data)
    return this.delay(bill)
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

  async setCurrency(currency: Currency): Promise<FinanceData> {
    const data = this.load()
    data.settings.currency = currency
    this.save(data)
    return this.delay(data)
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
