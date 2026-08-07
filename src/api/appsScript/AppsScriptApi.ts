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
import { getToken, clearToken } from '../../auth/token.ts'

/** Thrown when the backend rejects the token; triggers re-sign-in. */
export class AuthError extends Error {
  constructor() {
    super('unauthorized')
    this.name = 'AuthError'
  }
}

export class AppsScriptApi implements FinanceApi {
  private readonly url: string

  constructor(url: string) {
    this.url = url
  }

  private async call<T>(action: string, payload?: unknown): Promise<T> {
    const token = getToken()
    const res = await fetch(this.url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, token, payload }),
    })
    const json = (await res.json()) as { data?: T; error?: string }
    if (json.error) {
      if (json.error === 'unauthorized') {
        clearToken()
        throw new AuthError()
      }
      throw new Error(json.error)
    }
    return json.data as T
  }

  getAll(): Promise<FinanceData> {
    return this.call<FinanceData>('getAll')
  }

  addFund(input: NewFund): Promise<FundEntry> {
    return this.call<FundEntry>('addFund', input)
  }

  addBill(input: NewBill): Promise<Bill> {
    return this.call<Bill>('addBill', input)
  }

  setBillPaid(id: number, paid: boolean): Promise<Bill> {
    return this.call<Bill>('setBillPaid', { id, paid })
  }

  addExpendable(input: NewExpendable): Promise<ExpendableEntry> {
    return this.call<ExpendableEntry>('addExpendable', input)
  }

  async setMonthlyBudget(month: string, amount: number): Promise<void> {
    await this.call<null>('setMonthlyBudget', { month, amount })
  }

  addDebt(input: NewDebt): Promise<Debt> {
    return this.call<Debt>('addDebt', input)
  }

  updateDebt(id: number, patch: { name: string }): Promise<Debt> {
    return this.call<Debt>('updateDebt', { id, patch })
  }

  async deleteDebt(id: number): Promise<void> {
    await this.call<null>('deleteDebt', { id })
  }

  addScheduleRow(debtId: number, input: NewScheduleRow): Promise<DebtScheduleRow> {
    return this.call<DebtScheduleRow>('addScheduleRow', { debtId, input })
  }

  updateScheduleRow(id: number, patch: ScheduleRowPatch): Promise<DebtScheduleRow> {
    return this.call<DebtScheduleRow>('updateScheduleRow', { id, patch })
  }

  async deleteScheduleRow(id: number): Promise<void> {
    await this.call<null>('deleteScheduleRow', { id })
  }

  addStatement(debtId: number, input: NewStatement): Promise<DebtStatement> {
    return this.call<DebtStatement>('addStatement', { debtId, input })
  }

  updateStatement(id: number, patch: StatementPatch): Promise<DebtStatement> {
    return this.call<DebtStatement>('updateStatement', { id, patch })
  }

  async deleteStatement(id: number): Promise<void> {
    await this.call<null>('deleteStatement', { id })
  }

  async setCurrency(currency: Currency): Promise<void> {
    await this.call<null>('setCurrency', { currency })
  }

  addSavings(input: NewSavings): Promise<SavingsEntry> {
    return this.call<SavingsEntry>('addSavings', input)
  }

  transferSavingsToFunds(
    input: NewSavingsTransfer,
  ): Promise<{ transfer: SavingsTransfer; fund: FundEntry }> {
    return this.call<{ transfer: SavingsTransfer; fund: FundEntry }>(
      'transferSavingsToFunds',
      input,
    )
  }
}
