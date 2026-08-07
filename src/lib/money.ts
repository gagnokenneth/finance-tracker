import type { Currency } from '../types.ts'

// Intl.NumberFormat construction is not free; reuse one instance per currency.
const formatters = new Map<Currency, Intl.NumberFormat>()

function formatterFor(currency: Currency): Intl.NumberFormat {
  const cached = formatters.get(currency)
  if (cached) return cached
  const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency })
  formatters.set(currency, fmt)
  return fmt
}

/** Formats an amount in the given currency, e.g. 1234.5 -> "₱1,234.50". */
export function formatMoney(amount: number, currency: Currency): string {
  return formatterFor(currency).format(amount)
}
