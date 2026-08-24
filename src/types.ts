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

export type SavingsLedgerKind = 'deposit' | 'withdrawal' | 'bill_payment' | 'debt_payment'
export type SavingsRefType = 'bill_payable' | 'debt_schedule' | 'debt_statement'
export type AllocationTargetType = SavingsRefType | 'savings' | 'other'
export type AllocationSource = 'income' | 'savings'

/** Money in. Flat entries; no recurrence by design. */
export interface IncomeEntry {
  id: number
  source: string
  amount: number
  date: string // ISO yyyy-mm-dd
  notes?: string
  /** Set when this entry funds an allocation period. Blocks deletion. */
  allocation_period_id?: number
}

/**
 * One movement of the savings balance. Signed: positive is a deposit,
 * negative a withdrawal or a bill/debt payment. The balance is the sum of
 * these and is never stored — the retired SavingsEntry.total was a running
 * total computed at write time, which every later row silently contradicted
 * once an earlier one was edited or deleted.
 */
export interface SavingsLedgerEntry {
  id: number
  date: string
  amount: number
  kind: SavingsLedgerKind
  /** Set for the payment kinds: what this payment settled. */
  ref_type?: SavingsRefType
  ref_id?: number
  notes?: string
}

/** A recurring allocation plan. Instances live in allocation_periods. */
export interface Allocation {
  id: number
  name: string
  frequency: BillFrequency
  day: number
  second_day?: number
  month?: number
  closed: boolean
}

/** One occurrence of an allocation. */
export interface AllocationPeriod {
  id: number
  allocation_id: number
  period_date: string
}

/**
 * One earmark within a period. planned_amount is the intent; the committed
 * fields record what actually happened. planned_amount is independent of the
 * target's own amount, because a variable bill's payable has no figure until
 * its statement arrives.
 */
export interface AllocationLine {
  id: number
  period_id: number
  target_type: AllocationTargetType
  /** Unset for target_type 'other', which uses label instead. */
  target_id?: number
  label?: string
  planned_amount: number
  committed: boolean
  committed_date?: string
  committed_amount?: number
  source?: AllocationSource
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
  income: IncomeEntry[]
  savings_ledger: SavingsLedgerEntry[]
  allocations: Allocation[]
  allocation_periods: AllocationPeriod[]
  allocation_lines: AllocationLine[]
  settings: Settings
}
