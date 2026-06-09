import type { FinanceData } from '../types.ts'

export interface Summary {
  totalFunds: number
  totalBills: number
  billsPaid: number
  monthlyExpendable: number
  spentThisMonth: number
  remainingExpendable: number
  totalDebt: number
  savingsTotal: number
  remainingBalance: number
}

const sum = (ns: number[]): number => ns.reduce((a, b) => a + b, 0)

export function computeSummary(data: FinanceData, month: string): Summary {
  const totalFunds = sum(data.funds.map((f) => f.amount))
  const totalBills = sum(data.bills.map((b) => b.amount))
  const billsPaid = sum(data.bills.filter((b) => b.paid).map((b) => b.amount))
  const monthlyExpendable = data.settings.monthlyBudgets[month] ?? 0
  const spentThisMonth = sum(
    data.expendable.filter((e) => e.month === month).map((e) => e.daily_amount),
  )
  const remainingExpendable = monthlyExpendable - spentThisMonth
  const totalDebt = sum(data.debts.map((d) => d.remaining))
  const debtPayments = sum(data.debt_payments.map((p) => p.amount_paid))
  const savingsTotal =
    sum(data.savings.map((s) => s.amount)) -
    sum(data.savings_transfers.map((t) => t.amount))
  // Funds entries created by a savings transfer-back are recorded for history
  // but must NOT re-credit the balance — the reduced savingsTotal already does.
  const savingsReturnedToFunds = sum(
    data.funds.filter((f) => f.source === 'Savings').map((f) => f.amount),
  )
  const remainingBalance =
    totalFunds -
    savingsReturnedToFunds -
    billsPaid -
    monthlyExpendable -
    debtPayments -
    savingsTotal

  return {
    totalFunds,
    totalBills,
    billsPaid,
    monthlyExpendable,
    spentThisMonth,
    remainingExpendable,
    totalDebt,
    savingsTotal,
    remainingBalance,
  }
}
