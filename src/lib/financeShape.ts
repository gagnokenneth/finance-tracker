import type { FinanceData } from '../types.ts'
import { DEFAULT_CURRENCY } from './currency.ts'

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
  'income_sources',
  'savings_ledger',
  'tasks',
  'notes',
  'note_items',
]

/**
 * Fills in array fields a stored dataset is missing, in place.
 *
 * For persisted JSON that outlives code changes — MockApi's own localStorage
 * database, which is written by one build and read by the next. A blob missing
 * an array added later fails isFinanceData and takes every page down with
 * "Could not load your data", and no cache buster helps: that store is not the
 * query cache.
 *
 * Driven by the same list as the check itself, so a new field cannot be added
 * to one and forgotten in the other. Extra keys from retired modules are left
 * alone — isFinanceData ignores them.
 */
export function backfillArrays(value: FinanceData): void {
  const record = value as unknown as Record<string, unknown>
  for (const key of REQUIRED_ARRAYS) {
    if (!Array.isArray(record[key])) record[key] = []
  }
  if (!isRecord(record.settings)) record.settings = { currency: DEFAULT_CURRENCY }
}

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
