import type {
  FinanceData,
  FundEntry,
  Bill,
  ExpendableEntry,
  Debt,
  DebtPayment,
  SavingsEntry,
  SavingsTransfer,
} from '../types.ts'

// Inputs omit server-assigned fields.
export type NewFund = Omit<FundEntry, 'id'>
export type NewBill = Omit<Bill, 'id'>
export type NewExpendable = Omit<ExpendableEntry, 'id'>
export type NewDebt = Omit<Debt, 'id'>
export type NewDebtPayment = Omit<DebtPayment, 'id'>
export type NewSavings = Omit<SavingsEntry, 'id' | 'total'>
export type NewSavingsTransfer = Omit<SavingsTransfer, 'id'>

export interface FinanceApi {
  /** Read every sheet at once (dashboard + all module views derive from this). */
  getAll(): Promise<FinanceData>

  addFund(input: NewFund): Promise<FundEntry>

  addBill(input: NewBill): Promise<Bill>
  setBillPaid(id: number, paid: boolean): Promise<Bill>

  addExpendable(input: NewExpendable): Promise<ExpendableEntry>
  setMonthlyBudget(month: string, amount: number): Promise<void>

  addDebt(input: NewDebt): Promise<Debt>
  /** Records a payment AND reduces the debt's remaining balance. */
  payDebt(input: NewDebtPayment): Promise<{ payment: DebtPayment; debt: Debt }>

  /** Adds a savings entry; returns it with its computed running total. */
  addSavings(input: NewSavings): Promise<SavingsEntry>
  /** Moves money back to funds: creates a transfer AND a funds entry labeled "Savings". */
  transferSavingsToFunds(
    input: NewSavingsTransfer,
  ): Promise<{ transfer: SavingsTransfer; fund: FundEntry }>
}
