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
  AuthResult,
  SignupInput,
  LoginInput,
} from '../FinanceApi.ts'
import type {
  FinanceData,
  FundEntry,
  Bill,
  ExpendableEntry,
  SavingsEntry,
  SavingsTransfer,
  Currency,
} from '../../types.ts'
import { readToken, clearToken } from '../../auth/session.ts'

/**
 * Apps Script is slow: a cold start plus the tokeninfo round trip plus sheet
 * bootstrap can legitimately take tens of seconds on the very first request.
 * Generous, but finite.
 */
const REQUEST_TIMEOUT_MS = 45_000

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
    const token = readToken()

    // Without a deadline a stalled Apps Script request never settles, and the
    // UI shows a spinner forever with nothing in the console to look at.
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    let res: Response
    try {
      res = await fetch(this.url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action, token, payload }),
        signal: controller.signal,
      })
    } catch (err) {
      if (controller.signal.aborted) {
        throw new Error(
          `The backend did not respond within ${REQUEST_TIMEOUT_MS / 1000}s (${action}). ` +
            'Check Executions in the Apps Script editor.',
          { cause: err },
        )
      }
      throw err
    } finally {
      clearTimeout(timer)
    }

    // Apps Script answers with an HTML error page in some failure modes, which
    // res.json() would report only as a syntax error. Read text and say what
    // actually came back.
    const body = await res.text()
    let json: { data?: T; error?: string }
    try {
      json = JSON.parse(body) as { data?: T; error?: string }
    } catch (err) {
      throw new Error(
        `The backend returned a non-JSON response (HTTP ${res.status}) for ${action}: ` +
          `${body.slice(0, 200)}`,
        { cause: err },
      )
    }

    if (json.error) {
      if (json.error === 'unauthorized') {
        clearToken()
        throw new AuthError()
      }
      throw new Error(json.error)
    }
    return json.data as T
  }

  signup(input: SignupInput): Promise<AuthResult> {
    return this.call<AuthResult>('signup', input)
  }

  login(input: LoginInput): Promise<AuthResult> {
    return this.call<AuthResult>('login', input)
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

  addDebt(input: NewDebt): Promise<FinanceData> {
    return this.call<FinanceData>('addDebt', input)
  }

  updateDebt(id: number, patch: { name: string }): Promise<FinanceData> {
    return this.call<FinanceData>('updateDebt', { id, patch })
  }

  deleteDebt(id: number): Promise<FinanceData> {
    return this.call<FinanceData>('deleteDebt', { id })
  }

  addScheduleRow(debtId: number, input: NewScheduleRow): Promise<FinanceData> {
    return this.call<FinanceData>('addScheduleRow', { debtId, input })
  }

  updateScheduleRow(id: number, patch: ScheduleRowPatch): Promise<FinanceData> {
    return this.call<FinanceData>('updateScheduleRow', { id, patch })
  }

  deleteScheduleRow(id: number): Promise<FinanceData> {
    return this.call<FinanceData>('deleteScheduleRow', { id })
  }

  addStatement(debtId: number, input: NewStatement): Promise<FinanceData> {
    return this.call<FinanceData>('addStatement', { debtId, input })
  }

  updateStatement(id: number, patch: StatementPatch): Promise<FinanceData> {
    return this.call<FinanceData>('updateStatement', { id, patch })
  }

  deleteStatement(id: number): Promise<FinanceData> {
    return this.call<FinanceData>('deleteStatement', { id })
  }

  setCurrency(currency: Currency): Promise<FinanceData> {
    return this.call<FinanceData>('setCurrency', { currency })
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
