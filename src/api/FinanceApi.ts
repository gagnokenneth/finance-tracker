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
} from '../types.ts'

// Inputs omit server-assigned fields.
export type NewFund = Omit<FundEntry, 'id'>
export type NewBill = Omit<Bill, 'id'>
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

export interface FinanceApi {
  /** Read every sheet at once (all module views derive from this). */
  getAll(): Promise<FinanceData>

  addFund(input: NewFund): Promise<FundEntry>

  addBill(input: NewBill): Promise<Bill>
  setBillPaid(id: number, paid: boolean): Promise<Bill>

  addExpendable(input: NewExpendable): Promise<ExpendableEntry>
  setMonthlyBudget(month: string, amount: number): Promise<void>

  addDebt(input: NewDebt): Promise<Debt>
  updateDebt(id: number, patch: { name: string }): Promise<Debt>
  /** Deletes the debt and every row belonging to it. */
  deleteDebt(id: number): Promise<void>

  addScheduleRow(debtId: number, input: NewScheduleRow): Promise<DebtScheduleRow>
  /** Paying is an update: { paid: true, paid_date, paid_amount }. */
  updateScheduleRow(id: number, patch: ScheduleRowPatch): Promise<DebtScheduleRow>
  deleteScheduleRow(id: number): Promise<void>

  addStatement(debtId: number, input: NewStatement): Promise<DebtStatement>
  updateStatement(id: number, patch: StatementPatch): Promise<DebtStatement>
  deleteStatement(id: number): Promise<void>

  setCurrency(currency: Currency): Promise<void>

  /** Adds a savings entry; returns it with its computed running total. */
  addSavings(input: NewSavings): Promise<SavingsEntry>
  /** Moves money back to funds: creates a transfer AND a funds entry labeled "Savings". */
  transferSavingsToFunds(
    input: NewSavingsTransfer,
  ): Promise<{ transfer: SavingsTransfer; fund: FundEntry }>
}
