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

export interface Bill {
  id: number
  name: string
  amount: number
  due_date: string
  paid: boolean
  notes?: string
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
  min_due: number
  total_due: number
  outstanding: number
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
  expendable: ExpendableEntry[]
  debts: Debt[]
  debt_schedule: DebtScheduleRow[]
  debt_statements: DebtStatement[]
  savings: SavingsEntry[]
  savings_transfers: SavingsTransfer[]
  settings: Settings
}
