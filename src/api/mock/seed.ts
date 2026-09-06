import type { FinanceData } from '../../types.ts'

export function createSeed(): FinanceData {
  return {
    bills: [
      { id: 1, name: 'Rent', type: 'fixed', frequency: 'monthly', amount: 1500, day: 5, closed: false },
      { id: 2, name: 'Electricity', type: 'variable', frequency: 'monthly', day: 15, closed: false },
    ],
    bill_payables: [
      { id: 1, bill_id: 1, due_date: '2026-06-05', amount: 1500, paid: true, paid_date: '2026-06-04', paid_amount: 1500 },
      { id: 2, bill_id: 1, due_date: '2026-07-05', amount: 1500, paid: false },
      { id: 3, bill_id: 2, due_date: '2026-06-15', paid: false },
    ],
    debts: [],
    debt_schedule: [],
    debt_statements: [],
    income: [],
    income_sources: [],
    savings_ledger: [],
    tasks: [],
    notes: [],
    note_items: [],
    goals: [],
    settings: {
      currency: 'PHP',
    },
  }
}
