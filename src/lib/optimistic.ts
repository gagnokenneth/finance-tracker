import type {
  Bill,
  BillPayable,
  Debt,
  DebtScheduleRow,
  DebtStatement,
  FinanceData,
} from '../types.ts'
import type {
  BillPatch,
  BillPayablePatch,
  NewBill,
  NewDebt,
  NewScheduleRow,
  NewStatement,
  PayBillInput,
  ScheduleRowPatch,
  StatementPatch,
} from '../api/FinanceApi.ts'
import { tempId } from './tempId.ts'

/**
 * Client-side predictions of what a write does to the dataset, used to show the
 * result before the backend confirms it.
 *
 * Every function here must produce exactly what the backend would return for the
 * same call — both backends, Code.gs and MockApi. A row the backend has not seen
 * yet carries a temp id (lib/tempId.ts); the response replaces it with the real
 * row, so nothing here needs to reconcile ids.
 *
 * Money is never invented: a figure the backend derives from other rows must be
 * derived the same way here, or the prediction is a lie that only shows up as a
 * flicker when the truth arrives.
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

/**
 * The payable a new bill or a payment starts from — the mirror of newPayable in
 * both backends. A variable bill's payable has no figure yet: undefined means
 * "not set", which is not zero.
 */
function newPayable(bill: Pick<Bill, 'id' | 'type' | 'amount'>, dueDate: string): BillPayable {
  return {
    id: tempId(),
    bill_id: bill.id,
    due_date: dueDate,
    amount: bill.type === 'fixed' ? bill.amount : undefined,
    paid: false,
  }
}

/** Creates the bill and its first payable, as addBill does in one write. */
export function addBillTo(data: FinanceData, vars: NewBill): FinanceData {
  const { first_due_date, ...fields } = vars
  const bill: Bill = { id: tempId(), ...fields, closed: false }
  return {
    ...data,
    bills: [...data.bills, bill],
    bill_payables: [...data.bill_payables, newPayable(bill, first_due_date)],
  }
}

/**
 * Creates the debt and the rows it was given. Which table they land in follows
 * the debt's type, exactly as both backends split them. The rows themselves are
 * computed by the caller, so nothing here is server-derived but the ids.
 */
export function addDebtTo(data: FinanceData, vars: NewDebt): FinanceData {
  const debt: Debt = { id: tempId(), name: vars.name, type: vars.type }
  if (vars.type === 'fixed') {
    return {
      ...data,
      debts: [...data.debts, debt],
      debt_schedule: [
        ...data.debt_schedule,
        ...vars.rows.map((row) => ({ id: tempId(), debt_id: debt.id, ...row })),
      ],
    }
  }
  return {
    ...data,
    debts: [...data.debts, debt],
    debt_statements: [
      ...data.debt_statements,
      ...vars.rows.map((row) => ({ id: tempId(), debt_id: debt.id, ...row })),
    ],
  }
}

export function addScheduleRowTo(
  data: FinanceData,
  vars: { debtId: number; input: NewScheduleRow },
): FinanceData {
  return {
    ...data,
    debt_schedule: [...data.debt_schedule, { id: tempId(), debt_id: vars.debtId, ...vars.input }],
  }
}

export function addStatementTo(
  data: FinanceData,
  vars: { debtId: number; input: NewStatement },
): FinanceData {
  return {
    ...data,
    debt_statements: [
      ...data.debt_statements,
      { id: tempId(), debt_id: vars.debtId, ...vars.input },
    ],
  }
}

/**
 * Marks the payable paid and mints the next one, as payBillPayable does in one
 * write. The successor is minted only when nothing else is outstanding, the same
 * guard both backends apply so a double-submitted Pay cannot leave two competing
 * upcoming rows.
 */
export function payBillPayableIn(
  data: FinanceData,
  vars: { id: number; input: PayBillInput },
): FinanceData {
  const row = data.bill_payables.find((r) => r.id === vars.id)
  if (!row) return data
  const bill = data.bills.find((b) => b.id === row.bill_id)
  if (!bill) return data

  const paid = data.bill_payables.map((r) =>
    r.id === vars.id
      ? { ...r, paid: true, paid_date: vars.input.paid_date, paid_amount: vars.input.paid_amount }
      : r,
  )
  // Computed over the patched rows, which is how both backends exclude the row
  // being paid from the guard.
  const stillUnpaid = paid.some((r) => r.bill_id === bill.id && !r.paid)
  return {
    ...data,
    bill_payables: stillUnpaid ? paid : [...paid, newPayable(bill, vars.input.next_due_date)],
  }
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

/** Deleting a debt takes its rows with it, the same cascade the backend applies. */
export function removeDebt(data: FinanceData, id: number): FinanceData {
  return {
    ...data,
    debts: data.debts.filter((debt) => debt.id !== id),
    debt_schedule: data.debt_schedule.filter((row) => row.debt_id !== id),
    debt_statements: data.debt_statements.filter((row) => row.debt_id !== id),
  }
}
