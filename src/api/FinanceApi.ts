import type {
  FinanceData,
  FundEntry,
  Bill,
  BillPayable,
  ExpendableEntry,
  DebtScheduleRow,
  DebtStatement,
  SavingsEntry,
  SavingsTransfer,
  Currency,
} from '../types.ts'

// Inputs omit server-assigned fields.
export type NewFund = Omit<FundEntry, 'id'>
/**
 * A new bill and its first payable, in one call. The client computes
 * first_due_date because all four recurrence rules live in lib/billSchedule.ts;
 * the backend derives the payable's amount from the bill's own type.
 */
export type NewBill = Omit<Bill, 'id' | 'closed'> & { first_due_date: string }

/** Patches never carry id or closed — closing goes through closeBill. */
export type BillPatch = Partial<Omit<Bill, 'id' | 'closed'>>
export type BillPayablePatch = Partial<Omit<BillPayable, 'id' | 'bill_id'>>

/** Paying also mints the next payable, so the next due date comes with it. */
export interface PayBillInput {
  paid_date: string
  paid_amount: number
  next_due_date: string
}
export type NewExpendable = Omit<ExpendableEntry, 'id'>
export type NewSavings = Omit<SavingsEntry, 'id' | 'total'>
export type NewSavingsTransfer = Omit<SavingsTransfer, 'id'>

export type NewScheduleRow = Omit<DebtScheduleRow, 'id' | 'debt_id'>
export type NewStatement = Omit<DebtStatement, 'id' | 'debt_id'>

/** A debt is created together with its initial rows, in one call. */
export type NewDebt =
  | { name: string; type: 'fixed'; rows: NewScheduleRow[] }
  | { name: string; type: 'revolving'; rows: NewStatement[] }

/** Patches never carry id or debt_id — a row cannot be renumbered or moved. */
export type ScheduleRowPatch = Partial<NewScheduleRow>
export type StatementPatch = Partial<NewStatement>

export interface AuthResult {
  token: string
  user: { id: number; username: string }
}

export interface SignupInput {
  username: string
  derived: string
  invite_code: string
}

export interface LoginInput {
  username: string
  derived: string
}

export interface FinanceApi {
  /** Unauthenticated. Creates an account and returns a session. */
  signup(input: SignupInput): Promise<AuthResult>
  /** Unauthenticated. Returns a session for valid credentials. */
  login(input: LoginInput): Promise<AuthResult>

  /** Read every sheet at once (all module views derive from this). */
  getAll(): Promise<FinanceData>

  addFund(input: NewFund): Promise<FundEntry>

  addExpendable(input: NewExpendable): Promise<ExpendableEntry>
  setMonthlyBudget(month: string, amount: number): Promise<void>

  /*
   * Debt and currency writes return the whole updated dataset rather than the
   * affected row.
   *
   * Two reasons. It halves the work: the caller can drop the response straight
   * into its cache instead of firing a second read, and on Apps Script each
   * request costs over a second of fixed overhead. And it removes a race — a
   * follow-up read runs as a separate Apps Script execution, which can observe
   * state from before the write it is meant to reflect.
   */
  addDebt(input: NewDebt): Promise<FinanceData>
  updateDebt(id: number, patch: { name: string }): Promise<FinanceData>
  /** Deletes the debt and every row belonging to it. */
  deleteDebt(id: number): Promise<FinanceData>

  addScheduleRow(debtId: number, input: NewScheduleRow): Promise<FinanceData>
  /** Paying is an update: { paid: true, paid_date, paid_amount }. */
  updateScheduleRow(id: number, patch: ScheduleRowPatch): Promise<FinanceData>
  deleteScheduleRow(id: number): Promise<FinanceData>

  addStatement(debtId: number, input: NewStatement): Promise<FinanceData>
  updateStatement(id: number, patch: StatementPatch): Promise<FinanceData>
  deleteStatement(id: number): Promise<FinanceData>

  /* Bill writes return the whole updated dataset, for the same reasons above. */

  /** Creates the bill and its first payable. */
  addBill(input: NewBill): Promise<FinanceData>
  updateBill(id: number, patch: BillPatch): Promise<FinanceData>
  /** One-way. Removes the bill's unpaid payables and freezes the rest. */
  closeBill(id: number): Promise<FinanceData>
  /** Deletes the bill and every payable belonging to it. */
  deleteBill(id: number): Promise<FinanceData>

  /** Serves both Edit and Set amount. */
  updateBillPayable(id: number, patch: BillPayablePatch): Promise<FinanceData>
  deleteBillPayable(id: number): Promise<FinanceData>
  /** Marks the payable paid AND mints the next one, in one write. */
  payBillPayable(id: number, input: PayBillInput): Promise<FinanceData>

  setCurrency(currency: Currency): Promise<FinanceData>

  /** Adds a savings entry; returns it with its computed running total. */
  addSavings(input: NewSavings): Promise<SavingsEntry>
  /** Moves money back to funds: creates a transfer AND a funds entry labeled "Savings". */
  transferSavingsToFunds(
    input: NewSavingsTransfer,
  ): Promise<{ transfer: SavingsTransfer; fund: FundEntry }>
}
