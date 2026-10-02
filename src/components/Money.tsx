import { formatMoney } from '../lib/money.ts'
import { useCurrency } from '../hooks/useCurrency.ts'

/**
 * An amount in the user's currency, in tabular mono figures. It takes the
 * surrounding text colour — the design is monochrome, and a negative reads by
 * its minus sign.
 */
export function Money({ value, className }: { value: number; className?: string }) {
  const currency = useCurrency()
  return <span className={`tnum font-mono ${className ?? ''}`}>{formatMoney(value, currency)}</span>
}
