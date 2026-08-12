import { useState } from 'react'
import { useFinanceData } from '../hooks/useFinanceData.ts'
import { useFinanceMutations } from '../hooks/useFinanceMutations.ts'
import { useCurrency } from '../hooks/useCurrency.ts'
import { CURRENCY_LABELS } from '../lib/currency.ts'
import { errorDetail } from '../lib/errorText.ts'
import { ConfirmDialog } from '../components/ConfirmDialog.tsx'
import { LoadError } from '../components/LoadError.tsx'
import { LoadingScreen } from '../components/LoadingScreen.tsx'
import { PendingBadge } from '../components/PendingBadge.tsx'
import type { Currency } from '../types.ts'

const OPTIONS: Currency[] = ['PHP', 'USD']

export function Settings() {
  const { isPending, isError, error } = useFinanceData()
  const { setCurrency } = useFinanceMutations()
  const currency = useCurrency()
  /*
   * The currency asked for but not yet confirmed. Selecting a radio only records
   * it; the write happens on confirm. The radios stay checked from the active
   * currency, so cancelling needs no reset — nothing moved.
   */
  const [pending, setPending] = useState<Currency | null>(null)
  /*
   * What the last confirmed switch tried to set. A rejected write is not proof
   * the backend is unchanged: the request can fail after the sheet was written —
   * a lost response, or the client's own timeout — and the rollback restores a
   * snapshot that is only a guess. The refetch that rollback starts is what
   * settles it, so once the currency on screen matches what was attempted, the
   * write did land and the failure is stale news. Saying otherwise would
   * contradict the radios directly above the message.
   */
  const [attempt, setAttempt] = useState<Currency | null>(null)
  const unconfirmed = setCurrency.isError && attempt !== null && attempt !== currency
  const detail = errorDetail(setCurrency.error)

  if (isPending) return <LoadingScreen />
  if (isError) return <LoadError error={error} />

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Settings</h1>

      <section className="rounded-2xl border border-edge bg-white p-6">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-semibold tracking-wide text-ink-soft uppercase">Currency</h2>
          {setCurrency.isPending && <PendingBadge />}
        </div>
        <p className="mt-1 text-sm text-ink-soft">
          Changes the symbol on every amount. Nothing is converted.
        </p>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {OPTIONS.map((c) => {
            const active = currency === c
            return (
              <label
                key={c}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-colors ${
                  active ? 'border-brand bg-brand/5' : 'border-edge hover:bg-paper'
                }`}
              >
                <input
                  type="radio"
                  name="currency"
                  value={c}
                  checked={active}
                  disabled={setCurrency.isPending}
                  onChange={() => setPending(c)}
                  className="accent-brand"
                />
                <span>
                  <span className="block font-mono text-lg text-ink">
                    {c === 'PHP' ? '₱' : '$'}
                  </span>
                  <span className="block text-sm text-ink-soft">{CURRENCY_LABELS[c]}</span>
                </span>
              </label>
            )
          })}
        </div>

        {unconfirmed && (
          <div className="mt-3 space-y-1">
            <p className="text-sm text-overdue">
              That switch didn&rsquo;t confirm. Amounts are showing in{' '}
              {CURRENCY_LABELS[currency]}, which is the last value read back &mdash; the change may
              still have reached the backend. Reload to see what actually saved.
            </p>
            {detail !== '' && <p className="text-xs text-ink-soft">{detail}</p>}
          </div>
        )}
      </section>

      {pending && (
        <ConfirmDialog
          open
          tone="primary"
          title="Switch currency?"
          message={`Amounts will show in ${CURRENCY_LABELS[pending]}. Nothing is converted — existing records keep their figures.`}
          confirmLabel={`Switch to ${pending}`}
          onConfirm={() => {
            setAttempt(pending)
            setCurrency.mutate(pending)
            setPending(null)
          }}
          onClose={() => setPending(null)}
        />
      )}
    </div>
  )
}
