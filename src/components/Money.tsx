import { formatMoney } from '../lib/money.ts'
import { useCurrency } from '../hooks/useCurrency.ts'

/**
 * `tone="inherit"` takes the surrounding text colour — the revamp's pages are
 * monochrome, and a negative still reads by its minus sign. The default keeps
 * the original ink, red when negative, for pages not yet redesigned.
 */
export function Money({
  value,
  className,
  tone: toneMode = 'default',
}: {
  value: number
  className?: string
  tone?: 'default' | 'inherit'
}) {
  const currency = useCurrency()
  const tone = toneMode === 'inherit' ? '' : value < 0 ? 'text-overdue' : 'text-ink'
  return (
    <span className={`tnum font-mono ${tone} ${className ?? ''}`}>
      {formatMoney(value, currency)}
    </span>
  )
}
