import { isTemp } from './tempId.ts'
import type { SavingsLedgerEntry, SavingsLedgerKind, SavingsMovementKind } from '../types.ts'

/** Rows the user cannot edit here: FT-4 writes them against a real payment. */
export function isPaymentKind(kind: SavingsLedgerKind): boolean {
  return kind === 'bill_payment' || kind === 'debt_payment'
}

/**
 * The stored, signed amount for a kind and a positive magnitude. The form
 * collects a magnitude so the kind and the sign cannot disagree; this is the
 * one frontend place that converts, and it must match Code.gs and MockApi.
 */
export function signedAmount(kind: SavingsMovementKind, magnitude: number): number {
  const size = Math.abs(magnitude)
  return kind === 'withdrawal' ? -size : size
}

/**
 * The balance. A plain sum, so row order cannot affect it — which is the whole
 * reason the retired savings.total column is gone: it stored a running total
 * computed at write time, and editing any row left every later total wrong.
 */
export function savingsBalance(rows: SavingsLedgerEntry[]): number {
  return rows.reduce((sum, r) => sum + r.amount, 0)
}

/*
 * Temp ids are negative (lib/tempId.ts), so a plain numeric sort would place a
 * pending row before every saved row sharing its date. Saved first, pending
 * last, which is also the order they will settle into.
 */
export function byId(a: number, b: number): number {
  if (isTemp(a) !== isTemp(b)) return isTemp(a) ? 1 : -1
  return a - b
}

/**
 * Rows ordered exactly opposite `runningBalances`' accumulation order, so a
 * Balance column rendered top-to-bottom in this order reads as a monotone
 * sequence instead of jumping around on same-date rows.
 */
export function byDateDesc(a: SavingsLedgerEntry, b: SavingsLedgerEntry): number {
  return b.date.localeCompare(a.date) || byId(b.id, a.id)
}

/**
 * Balance after each movement, keyed by row id.
 *
 * Unlike savingsBalance this depends entirely on order, so the order is pinned
 * to (date, id) rather than however the sheet returned the rows — two movements
 * sharing a date must not swap places between renders.
 */
export function runningBalances(rows: SavingsLedgerEntry[]): Map<number, number> {
  const ordered = [...rows].sort((a, b) => a.date.localeCompare(b.date) || byId(a.id, b.id))
  const balances = new Map<number, number>()
  let sum = 0
  for (const row of ordered) {
    sum += row.amount
    balances.set(row.id, sum)
  }
  return balances
}

/**
 * Payment rows indexed by what they settled, keyed `${ref_type}:${ref_id}`.
 *
 * FT-3 creates no rows this would index. It lives here because FT-4 marks a
 * savings-funded payment in the Bills and Debts views from it, and FT-7 needs
 * it to avoid counting one outflow twice — and every savings derivation
 * belongs in one module.
 */
export function paymentsByRef(rows: SavingsLedgerEntry[]): Map<string, SavingsLedgerEntry> {
  const index = new Map<string, SavingsLedgerEntry>()
  for (const row of rows) {
    if (row.ref_type !== undefined && row.ref_id !== undefined) {
      index.set(`${row.ref_type}:${row.ref_id}`, row)
    }
  }
  return index
}
