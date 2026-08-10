import type { BillPayable, DebtScheduleRow, DebtStatement, FinanceData } from '../types.ts'
import type {
  BillPatch,
  BillPayablePatch,
  ScheduleRowPatch,
  StatementPatch,
} from '../api/FinanceApi.ts'

/**
 * Client-side predictions of what a write does to the dataset, used to show the
 * result before the backend confirms it.
 *
 * Every function here must produce exactly what the backend would return for the
 * same call. That is only safe where the outcome needs no information the client
 * lacks — no server-assigned ids, no money recomputed from other rows — which is
 * why adds are absent: the backend assigns their ids and, for a new debt, builds
 * the whole schedule. Those still wait for the real answer.
 */

/**
 * Both backends drop the paid fields when a row goes back to unpaid — MockApi
 * via clearPaidFields, Code.gs by blanking them explicitly. A plain merge would
 * leave the old date and amount on the row until the server replied, which is
 * the sort of near-miss this file exists to avoid.
 */
function clearPaidWhenUnpaid<T extends DebtScheduleRow | DebtStatement | BillPayable>(row: T): T {
  if (row.paid) return row
  const next = { ...row }
  delete next.paid_date
  delete next.paid_amount
  return next
}

/** The wire's null becomes the model's undefined — see StatementPatch. */
function clearedAmounts(patch: StatementPatch): Partial<DebtStatement> {
  const applied: Partial<DebtStatement> = { ...patch } as Partial<DebtStatement>
  for (const key of ['min_due', 'total_due', 'outstanding'] as const) {
    if (patch[key] === null) applied[key] = undefined
  }
  return applied
}

export function applyScheduleRowPatch(
  data: FinanceData,
  vars: { id: number; patch: ScheduleRowPatch },
): FinanceData {
  return {
    ...data,
    debt_schedule: data.debt_schedule.map((row) =>
      row.id === vars.id ? clearPaidWhenUnpaid({ ...row, ...vars.patch }) : row,
    ),
  }
}

export function applyStatementPatch(
  data: FinanceData,
  vars: { id: number; patch: StatementPatch },
): FinanceData {
  return {
    ...data,
    debt_statements: data.debt_statements.map((row) =>
      row.id === vars.id ? clearPaidWhenUnpaid({ ...row, ...clearedAmounts(vars.patch) }) : row,
    ),
  }
}

export function removeScheduleRow(data: FinanceData, id: number): FinanceData {
  return { ...data, debt_schedule: data.debt_schedule.filter((row) => row.id !== id) }
}

export function removeStatement(data: FinanceData, id: number): FinanceData {
  return { ...data, debt_statements: data.debt_statements.filter((row) => row.id !== id) }
}

export function renameDebt(data: FinanceData, vars: { id: number; name: string }): FinanceData {
  return {
    ...data,
    debts: data.debts.map((debt) =>
      debt.id === vars.id ? { ...debt, name: vars.name } : debt,
    ),
  }
}

export function applyBillPatch(
  data: FinanceData,
  vars: { id: number; patch: BillPatch },
): FinanceData {
  return {
    ...data,
    bills: data.bills.map((bill) => (bill.id === vars.id ? { ...bill, ...vars.patch } : bill)),
  }
}

/**
 * Closing drops the unpaid payables and freezes the rest — the same two effects
 * the backend applies, both computable here.
 */
export function closeBillIn(data: FinanceData, id: number): FinanceData {
  return {
    ...data,
    bills: data.bills.map((bill) => (bill.id === id ? { ...bill, closed: true } : bill)),
    bill_payables: data.bill_payables.filter((row) => row.bill_id !== id || row.paid),
  }
}

/** Deleting a bill takes its payables with it, the same cascade the backend applies. */
export function removeBill(data: FinanceData, id: number): FinanceData {
  return {
    ...data,
    bills: data.bills.filter((bill) => bill.id !== id),
    bill_payables: data.bill_payables.filter((row) => row.bill_id !== id),
  }
}

export function applyBillPayablePatch(
  data: FinanceData,
  vars: { id: number; patch: BillPayablePatch },
): FinanceData {
  return {
    ...data,
    bill_payables: data.bill_payables.map((row) =>
      row.id === vars.id ? clearPaidWhenUnpaid({ ...row, ...vars.patch }) : row,
    ),
  }
}

export function removeBillPayable(data: FinanceData, id: number): FinanceData {
  return { ...data, bill_payables: data.bill_payables.filter((row) => row.id !== id) }
}

/*
 * There is deliberately no prediction for payBillPayable: it mints a payable
 * whose id the backend assigns, which is the case the note at the top of this
 * file excludes.
 */

/** Deleting a debt takes its rows with it, the same cascade the backend applies. */
export function removeDebt(data: FinanceData, id: number): FinanceData {
  return {
    ...data,
    debts: data.debts.filter((debt) => debt.id !== id),
    debt_schedule: data.debt_schedule.filter((row) => row.debt_id !== id),
    debt_statements: data.debt_statements.filter((row) => row.debt_id !== id),
  }
}
