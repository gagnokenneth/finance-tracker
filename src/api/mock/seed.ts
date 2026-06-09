import type { FinanceData } from '../../types.ts'

export function createSeed(): FinanceData {
  return {
    funds: [
      { id: 1, source: 'Salary', amount: 5000, date: '2026-06-01' },
      { id: 2, source: 'Freelance', amount: 1000, date: '2026-06-10' },
    ],
    bills: [
      { id: 1, name: 'Rent', amount: 1500, due_date: '2026-06-05', paid: true },
      { id: 2, name: 'Electricity', amount: 200, due_date: '2026-06-15', paid: false },
    ],
    expendable: [
      { id: 1, month: '2026-06', daily_amount: 100, date: '2026-06-02' },
      { id: 2, month: '2026-06', daily_amount: 50, date: '2026-06-03' },
    ],
    debts: [
      { id: 1, name: 'Credit Card', total_amount: 2000, remaining: 1200, type: 'straight', interest_rate: 0 },
    ],
    debt_payments: [
      { id: 1, debt_id: 1, amount_paid: 800, date: '2026-06-07' },
    ],
    savings: [
      { id: 1, date: '2026-06-01', amount: 500, source: 'funds', total: 500 },
    ],
    savings_transfers: [
      { id: 1, date: '2026-06-20', amount: 200 },
    ],
    settings: {
      monthlyBudgets: { '2026-06': 900 },
      allowedEmails: ['ken.gagno@vibeteams.ai'],
    },
  }
}
