export type DebtType = 'fixed' | 'revolving'
export type BillType = 'fixed' | 'variable'
export type BillFrequency = 'bimonthly' | 'monthly' | 'quarterly' | 'annually'
export type SavingsSource = 'funds' | 'remaining_expendable'
export type Currency = 'PHP' | 'USD'

export interface FundEntry {
  id: number
  source: string
  amount: number
  date: string // ISO yyyy-mm-dd
  notes?: string
}

/**
 * A recurring bill. Holds the recurrence rule; the due instances live in
 * bill_payables, and only one unpaid payable exists at a time — paying it mints
 * the next.
 */
export interface Bill {
  id: number
  name: string
  type: BillType
  frequency: BillFrequency
  /** The figure each payable starts from. Required for fixed, unset for variable. */
  amount?: number
  /** Day of the month; for bimonthly, the first-half day. */
  day: number
  /** Bimonthly only: the second-half day. */
  second_day?: number
  /** Annually only: 1-12. */
  month?: number
  /** Closed bills are read-only: no edits, no payments, no row deletes. */
  closed: boolean
}

/** One due instance of a bill. */
export interface BillPayable {
  id: number
  bill_id: number
  due_date: string // ISO yyyy-mm-dd
  /** Undefined means not set yet — a variable bill's figure before the statement arrives. */
  amount?: number
  paid: boolean
  paid_date?: string
  paid_amount?: number
}

export interface ExpendableEntry {
  id: number
  month: string // yyyy-mm
  daily_amount: number
  date: string
  notes?: string
}

export interface Debt {
  id: number
  name: string
  type: DebtType
}

/** One installment of a fixed debt. */
export interface DebtScheduleRow {
  id: number
  debt_id: number
  due_date: string // ISO yyyy-mm-dd
  amount: number
  paid: boolean
  paid_date?: string
  paid_amount?: number
}

/** One statement of a revolving debt. */
export interface DebtStatement {
  id: number
  debt_id: number
  due_date: string
  /** Undefined means not set yet — an auto-generated statement starts empty. */
  min_due?: number
  total_due?: number
  outstanding?: number
  paid: boolean
  paid_date?: string
  paid_amount?: number
}

export interface SavingsEntry {
  id: number
  date: string
  amount: number
  source: SavingsSource
  total: number // computed running total at write time
  notes?: string
}

export interface SavingsTransfer {
  id: number
  date: string
  amount: number
  notes?: string
}

export interface Settings {
  // monthly expendable budget keyed by yyyy-mm
  monthlyBudgets: Record<string, number>
  /** Per-user: comes from the caller's own row, not a global setting. */
  currency: Currency
}

/** All sheets, as the frontend holds them in memory. */
export interface FinanceData {
  funds: FundEntry[]
  bills: Bill[]
  bill_payables: BillPayable[]
  expendable: ExpendableEntry[]
  debts: Debt[]
  debt_schedule: DebtScheduleRow[]
  debt_statements: DebtStatement[]
  savings: SavingsEntry[]
  savings_transfers: SavingsTransfer[]
  settings: Settings
}
