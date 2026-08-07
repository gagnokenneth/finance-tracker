import type { Currency } from '../types.ts'

export const DEFAULT_CURRENCY: Currency = 'PHP'

export const CURRENCY_LABELS: Record<Currency, string> = {
  PHP: 'Philippine peso',
  USD: 'US dollar',
}

const CACHE_KEY = 'finance.currency'

function isCurrency(v: unknown): v is Currency {
  return v === 'PHP' || v === 'USD'
}

/** Last known currency, for a correct symbol on first paint before data loads. */
export function readCachedCurrency(): Currency | null {
  const raw = localStorage.getItem(CACHE_KEY)
  return isCurrency(raw) ? raw : null
}

export function writeCachedCurrency(c: Currency): void {
  localStorage.setItem(CACHE_KEY, c)
}
