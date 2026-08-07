export type DebtType = 'straight' | 'installment'
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
  total_amount: number
  remaining: number
  type: DebtType
  interest_rate: number
  notes?: string
}

export interface DebtPayment {
  id: number
  debt_id: number
  amount_paid: number
  date: string
  notes?: string
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
  allowedEmails: string[]
  currency: Currency
}

/** All sheets, as the frontend holds them in memory. */
export interface FinanceData {
  funds: FundEntry[]
  bills: Bill[]
  expendable: ExpendableEntry[]
  debts: Debt[]
  debt_payments: DebtPayment[]
  savings: SavingsEntry[]
  savings_transfers: SavingsTransfer[]
  settings: Settings
}
