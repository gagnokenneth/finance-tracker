import type {
  Bill,
  BillPayable,
  Debt,
  DebtScheduleRow,
  DebtStatement,
  FinanceData,
  IncomeEntry,
  IncomeSource,
  SavingsLedgerEntry,
  SavingsMovementKind,
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
  NewIncome,
  IncomePatch,
  NewIncomeSource,
  IncomeSourcePatch,
  NewSavingsEntry,
  SavingsEntryPatch,
} from '../api/FinanceApi.ts'
import { tempId } from './tempId.ts'
import { signedAmount } from './savings.ts'

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
  const withDebt = { ...data, debts: [...data.debts, debt] }
  // Mapped inside each branch so the row type stays narrowed to the table it
  // lands in — a statement must not be appendable to the schedule.
  return vars.type === 'fixed'
    ? {
        ...withDebt,
        debt_schedule: [
          ...data.debt_schedule,
          ...vars.rows.map((row) => ({ id: tempId(), debt_id: debt.id, ...row })),
        ],
      }
    : {
        ...withDebt,
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
  const before = data.bill_payables.find((row) => row.id === vars.id)
  const rows = data.bill_payables.map((row) =>
    row.id === vars.id ? clearPaidWhenUnpaid({ ...row, ...vars.patch }) : row,
  )
  /*
   * Undoing a payment un-mints the payable that payment created — the inverse of
   * payBillPayableIn, applied by both backends.
   *
   * Only the latest paid payable has one to un-mint: an older payment's successor
   * has since been paid itself, so undoing it must leave the open payable alone.
   * Deleting it would discard a figure the user entered, and would let the
   * re-payment mint a duplicate of a month already paid.
   *
   * Also guarded on the stored row having been paid, so editing an already-unpaid
   * payable's amount deletes nothing.
   */
  const unmint =
    before !== undefined &&
    before.paid &&
    vars.patch.paid === false &&
    !data.bill_payables.some(
      (row) =>
        row.bill_id === before.bill_id &&
        row.id !== vars.id &&
        row.paid &&
        row.due_date > before.due_date,
    )
  return {
    ...data,
    bill_payables: unmint
      ? rows.filter((row) => row.id === vars.id || row.bill_id !== before.bill_id || row.paid)
      : rows,
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

export function addIncomeTo(data: FinanceData, vars: NewIncome): FinanceData {
  const entry: IncomeEntry = { id: tempId(), ...vars }
  return { ...data, income: [...data.income, entry] }
}

/** The wire's null becomes the model's undefined — see IncomePatch. */
function clearedNotes(patch: IncomePatch): Partial<IncomeEntry> {
  const applied: Partial<IncomeEntry> = { ...patch } as Partial<IncomeEntry>
  if (patch.notes === null) applied.notes = undefined
  return applied
}

export function applyIncomePatch(
  data: FinanceData,
  vars: { id: number; patch: IncomePatch },
): FinanceData {
  return {
    ...data,
    income: data.income.map((row) =>
      row.id === vars.id ? { ...row, ...clearedNotes(vars.patch) } : row,
    ),
  }
}

export function removeIncome(data: FinanceData, id: number): FinanceData {
  return { ...data, income: data.income.filter((row) => row.id !== id) }
}

export function addIncomeSourceTo(data: FinanceData, vars: NewIncomeSource): FinanceData {
  // archived: false mirrors what both backends assign — a prediction that left
  // it undefined would flicker when the response arrived.
  const source: IncomeSource = { id: tempId(), name: vars.name, archived: false }
  return { ...data, income_sources: [...data.income_sources, source] }
}

export function applyIncomeSourcePatch(
  data: FinanceData,
  vars: { id: number; patch: IncomeSourcePatch },
): FinanceData {
  return {
    ...data,
    income_sources: data.income_sources.map((s) =>
      s.id === vars.id ? { ...s, ...vars.patch } : s,
    ),
  }
}

/**
 * Only ever called for a source with no entries — both backends refuse
 * otherwise — so no entry needs re-pointing here.
 */
export function removeIncomeSource(data: FinanceData, id: number): FinanceData {
  return { ...data, income_sources: data.income_sources.filter((s) => s.id !== id) }
}

export function addSavingsEntryTo(data: FinanceData, vars: NewSavingsEntry): FinanceData {
  // signedAmount, not the raw magnitude: a prediction storing the magnitude
  // unsigned would show a withdrawal INCREASING the balance until the response
  // arrived. Both backends convert the same way.
  const entry: SavingsLedgerEntry = {
    id: tempId(),
    date: vars.date,
    amount: signedAmount(vars.kind, vars.amount),
    kind: vars.kind,
    notes: vars.notes,
  }
  return { ...data, savings_ledger: [...data.savings_ledger, entry] }
}

export function applySavingsEntryPatch(
  data: FinanceData,
  vars: { id: number; patch: SavingsEntryPatch },
): FinanceData {
  return {
    ...data,
    savings_ledger: data.savings_ledger.map((row) => {
      if (row.id !== vars.id) return row
      const patch = vars.patch
      const next: SavingsLedgerEntry = { ...row }
      if (patch.date !== undefined) next.date = patch.date
      if (patch.notes !== undefined) next.notes = patch.notes === null ? undefined : patch.notes
      // Kind and amount are predicted together, matching the backend: either one
      // changes the signed value the balance is summed from.
      if (patch.kind !== undefined || patch.amount !== undefined) {
        const kind = (patch.kind ?? row.kind) as SavingsMovementKind
        const magnitude = patch.amount ?? Math.abs(row.amount)
        next.kind = kind
        next.amount = signedAmount(kind, magnitude)
      }
      return next
    }),
  }
}

export function removeSavingsEntry(data: FinanceData, id: number): FinanceData {
  return { ...data, savings_ledger: data.savings_ledger.filter((row) => row.id !== id) }
}
