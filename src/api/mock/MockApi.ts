import type { FinanceApi, NewFund, NewBill, NewExpendable, NewDebt, NewDebtPayment, NewSavings, NewSavingsTransfer } from '../FinanceApi.ts'
import type { FinanceData, FundEntry, Bill, ExpendableEntry, Debt, DebtPayment, SavingsEntry, SavingsTransfer } from '../../types.ts'
import { createSeed } from './seed.ts'

const KEY = 'finance-mock-db'

function nextId<T extends { id: number }>(rows: T[]): number {
  return rows.reduce((max, r) => Math.max(max, r.id), 0) + 1
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

  async addDebt(input: NewDebt): Promise<Debt> {
    const data = this.load()
    const debt: Debt = { id: nextId(data.debts), ...input }
    data.debts.push(debt)
    this.save(data)
    return this.delay(debt)
  }

  async payDebt(input: NewDebtPayment): Promise<{ payment: DebtPayment; debt: Debt }> {
    const data = this.load()
    const debt = data.debts.find((d) => d.id === input.debt_id)
    if (!debt) throw new Error(`Debt ${input.debt_id} not found`)
    const payment: DebtPayment = { id: nextId(data.debt_payments), ...input }
    data.debt_payments.push(payment)
    debt.remaining = debt.remaining - input.amount_paid
    this.save(data)
    return this.delay({ payment, debt })
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
