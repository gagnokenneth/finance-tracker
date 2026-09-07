import type {
  FinanceApi,
  NewBill,
  BillPatch,
  BillPayablePatch,
  PayBillInput,
  NewDebt,
  NewScheduleRow,
  NewStatement,
  ScheduleRowPatch,
  StatementPatch,
  AuthResult,
  SignupInput,
  LoginInput,
  NewIncome,
  IncomePatch,
  NewIncomeSource,
  IncomeSourcePatch,
  NewSavingsEntry,
  SavingsEntryPatch,
  NewTask,
  TaskPatch,
  MoveTaskInput,
  NewTaskColumn,
  TaskColumnPatch,
  NewNote,
  NotePatch,
  NewNoteItem,
  NoteItemPatch,
  NewGoal,
  GoalPatch,
} from '../FinanceApi.ts'
import type { FinanceData, Currency } from '../../types.ts'
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

  addBill(input: NewBill): Promise<FinanceData> {
    return this.call<FinanceData>('addBill', input)
  }

  updateBill(id: number, patch: BillPatch): Promise<FinanceData> {
    return this.call<FinanceData>('updateBill', { id, patch })
  }

  closeBill(id: number): Promise<FinanceData> {
    return this.call<FinanceData>('closeBill', { id })
  }

  deleteBill(id: number): Promise<FinanceData> {
    return this.call<FinanceData>('deleteBill', { id })
  }

  updateBillPayable(id: number, patch: BillPayablePatch): Promise<FinanceData> {
    return this.call<FinanceData>('updateBillPayable', { id, patch })
  }

  deleteBillPayable(id: number): Promise<FinanceData> {
    return this.call<FinanceData>('deleteBillPayable', { id })
  }

  payBillPayable(id: number, input: PayBillInput): Promise<FinanceData> {
    return this.call<FinanceData>('payBillPayable', { id, input })
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

  updateScheduleRow(
    id: number,
    patch: ScheduleRowPatch,
    fromSavings?: boolean,
  ): Promise<FinanceData> {
    return this.call<FinanceData>('updateScheduleRow', { id, patch, from_savings: fromSavings })
  }

  deleteScheduleRow(id: number): Promise<FinanceData> {
    return this.call<FinanceData>('deleteScheduleRow', { id })
  }

  addStatement(debtId: number, input: NewStatement): Promise<FinanceData> {
    return this.call<FinanceData>('addStatement', { debtId, input })
  }

  updateStatement(
    id: number,
    patch: StatementPatch,
    fromSavings?: boolean,
  ): Promise<FinanceData> {
    return this.call<FinanceData>('updateStatement', { id, patch, from_savings: fromSavings })
  }

  deleteStatement(id: number): Promise<FinanceData> {
    return this.call<FinanceData>('deleteStatement', { id })
  }

  setCurrency(currency: Currency): Promise<FinanceData> {
    return this.call<FinanceData>('setCurrency', { currency })
  }

  addIncome(input: NewIncome): Promise<FinanceData> {
    return this.call<FinanceData>('addIncome', { input })
  }

  updateIncome(id: number, patch: IncomePatch): Promise<FinanceData> {
    return this.call<FinanceData>('updateIncome', { id, patch })
  }

  deleteIncome(id: number): Promise<FinanceData> {
    return this.call<FinanceData>('deleteIncome', { id })
  }

  addIncomeSource(input: NewIncomeSource): Promise<FinanceData> {
    return this.call<FinanceData>('addIncomeSource', { input })
  }

  updateIncomeSource(id: number, patch: IncomeSourcePatch): Promise<FinanceData> {
    return this.call<FinanceData>('updateIncomeSource', { id, patch })
  }

  deleteIncomeSource(id: number): Promise<FinanceData> {
    return this.call<FinanceData>('deleteIncomeSource', { id })
  }

  addSavingsEntry(input: NewSavingsEntry): Promise<FinanceData> {
    return this.call<FinanceData>('addSavingsEntry', { input })
  }

  updateSavingsEntry(id: number, patch: SavingsEntryPatch): Promise<FinanceData> {
    return this.call<FinanceData>('updateSavingsEntry', { id, patch })
  }

  deleteSavingsEntry(id: number): Promise<FinanceData> {
    return this.call<FinanceData>('deleteSavingsEntry', { id })
  }

  addTask(input: NewTask): Promise<FinanceData> {
    return this.call<FinanceData>('addTask', { input })
  }
  updateTask(id: number, patch: TaskPatch): Promise<FinanceData> {
    return this.call<FinanceData>('updateTask', { id, patch })
  }
  deleteTask(id: number): Promise<FinanceData> {
    return this.call<FinanceData>('deleteTask', { id })
  }
  moveTask(id: number, input: MoveTaskInput): Promise<FinanceData> {
    return this.call<FinanceData>('moveTask', { id, input })
  }

  addTaskColumn(input: NewTaskColumn): Promise<FinanceData> {
    return this.call<FinanceData>('addTaskColumn', { input })
  }
  updateTaskColumn(id: number, patch: TaskColumnPatch): Promise<FinanceData> {
    return this.call<FinanceData>('updateTaskColumn', { id, patch })
  }
  deleteTaskColumn(id: number): Promise<FinanceData> {
    return this.call<FinanceData>('deleteTaskColumn', { id })
  }

  addNote(input: NewNote): Promise<FinanceData> {
    return this.call<FinanceData>('addNote', { input })
  }
  updateNote(id: number, patch: NotePatch): Promise<FinanceData> {
    return this.call<FinanceData>('updateNote', { id, patch })
  }
  deleteNote(id: number): Promise<FinanceData> {
    return this.call<FinanceData>('deleteNote', { id })
  }
  addNoteItem(noteId: number, input: NewNoteItem): Promise<FinanceData> {
    return this.call<FinanceData>('addNoteItem', { noteId, input })
  }
  updateNoteItem(id: number, patch: NoteItemPatch): Promise<FinanceData> {
    return this.call<FinanceData>('updateNoteItem', { id, patch })
  }
  deleteNoteItem(id: number): Promise<FinanceData> {
    return this.call<FinanceData>('deleteNoteItem', { id })
  }

  addGoal(input: NewGoal): Promise<FinanceData> {
    return this.call<FinanceData>('addGoal', { input })
  }
  updateGoal(id: number, patch: GoalPatch): Promise<FinanceData> {
    return this.call<FinanceData>('updateGoal', { id, patch })
  }
  deleteGoal(id: number): Promise<FinanceData> {
    return this.call<FinanceData>('deleteGoal', { id })
  }
}
