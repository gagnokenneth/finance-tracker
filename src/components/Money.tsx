import { formatMoney } from '../lib/money.ts'
import { useCurrency } from '../hooks/useCurrency.ts'

export function Money({ value, className }: { value: number; className?: string }) {
  const currency = useCurrency()
  const tone = value < 0 ? 'text-red-600' : 'text-slate-900'
  return <span className={`${tone} ${className ?? ''}`}>{formatMoney(value, currency)}</span>
}
