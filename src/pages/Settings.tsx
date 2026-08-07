import { useFinanceData } from '../hooks/useFinanceData.ts'
import { useFinanceMutations } from '../hooks/useFinanceMutations.ts'
import { useCurrency } from '../hooks/useCurrency.ts'
import { CURRENCY_LABELS } from '../lib/currency.ts'
import { Card } from '../components/Card.tsx'
import type { Currency } from '../types.ts'

const OPTIONS: Currency[] = ['PHP', 'USD']

export function Settings() {
  const { isLoading, isError } = useFinanceData()
  const { setCurrency } = useFinanceMutations()
  const currency = useCurrency()

  if (isLoading) return <p className="text-slate-500">Loading…</p>
  if (isError) return <p className="text-red-600">Failed to load settings.</p>

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Settings</h1>
      <Card title="Currency">
        <div className="flex flex-col gap-2">
          {OPTIONS.map((c) => (
            <label key={c} className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="radio"
                name="currency"
                value={c}
                checked={currency === c}
                disabled={setCurrency.isPending}
                onChange={() => setCurrency.mutate(c)}
              />
              {CURRENCY_LABELS[c]}
            </label>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Changes the displayed symbol only — amounts are not converted.
        </p>
        {setCurrency.isError && (
          <p className="mt-2 text-sm text-red-600">Could not save. Please try again.</p>
        )}
      </Card>
    </div>
  )
}
