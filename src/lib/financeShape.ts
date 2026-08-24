import type { FinanceData } from '../types.ts'

/**
 * The array fields every page indexes into without checking. A dataset missing
 * one of them does not fail where it is read — it fails inside a render, which
 * takes the whole app down with it and keeps taking it down on every reload once
 * the value is in persisted storage. Debts.tsx calling data.debts.reduce is the
 * shape of that crash.
 *
 * Kept as a literal list rather than derived from the type, because the type is
 * erased at runtime and this check exists precisely for data the compiler never
 * saw: a rehydrated cache, and a backend response.
 */
const REQUIRED_ARRAYS: readonly (keyof FinanceData)[] = [
  'bills',
  'bill_payables',
  'debts',
  'debt_schedule',
  'debt_statements',
  'income',
  'savings_ledger',
  'allocations',
  'allocation_periods',
  'allocation_lines',
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/**
 * Whether a value is usable as the dataset. Deliberately shallow: it checks the
 * fields whose absence crashes a render, not the contents of every row. A wrong
 * figure inside a row is a bug; a missing array is an outage.
 */
export function isFinanceData(value: unknown): value is FinanceData {
  if (!isRecord(value)) return false
  if (!REQUIRED_ARRAYS.every((key) => Array.isArray(value[key]))) return false
  return isRecord(value.settings)
}
