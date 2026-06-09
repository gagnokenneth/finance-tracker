const fmt = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

/** Formats a number as USD, e.g. 1234.5 -> "$1,234.50", -50 -> "-$50.00". */
export function formatMoney(amount: number): string {
  return fmt.format(amount)
}
