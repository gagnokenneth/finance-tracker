import type { Currency } from '../types.ts'

export const DEFAULT_CURRENCY: Currency = 'PHP'

export const CURRENCY_LABELS: Record<Currency, string> = {
  PHP: 'Philippine peso',
  USD: 'US dollar',
}

/*
 * The persisted query cache already stores settings.currency, so this overlaps
 * with it deliberately: rehydration happens a frame after mount, and this is
 * read during it, so the very first paint carries the right symbol instead of
 * flashing the default.
 *
 * Keyed by user, like that cache: two accounts on one browser can have
 * different currencies, and the second must not paint with the first's symbol.
 */
const CACHE_PREFIX = 'finance.currency.'

function cacheKey(userId: number): string {
  return `${CACHE_PREFIX}${userId}`
}

function isCurrency(v: unknown): v is Currency {
  return v === 'PHP' || v === 'USD'
}

/** Last known currency, for a correct symbol on first paint before data loads. */
export function readCachedCurrency(userId: number | undefined): Currency | null {
  if (userId === undefined) return null
  const raw = localStorage.getItem(cacheKey(userId))
  return isCurrency(raw) ? raw : null
}

export function writeCachedCurrency(userId: number, c: Currency): void {
  localStorage.setItem(cacheKey(userId), c)
}

export function clearCachedCurrency(userId: number): void {
  localStorage.removeItem(cacheKey(userId))
}
