import { useState } from 'react'
import { useFinanceData } from '../hooks/useFinanceData.ts'
import { useFinanceMutations } from '../hooks/useFinanceMutations.ts'
import { useCurrency } from '../hooks/useCurrency.ts'
import { CURRENCY_LABELS } from '../lib/currency.ts'
import { errorDetail } from '../lib/errorText.ts'
import {
  BrutalConfirm,
  BrutalFormError,
  BrutalPageHeader,
  labelClass,
  panelClass,
  squareControlShape,
} from '../components/brutal.tsx'
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
    <div className="space-y-10">
      <BrutalPageHeader title="Settings" />

      <section className={`${panelClass} space-y-5 p-8`}>
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h2 className={labelClass}>Currency</h2>
            {setCurrency.isPending && <PendingBadge />}
          </div>
          <p className="font-mono text-xs text-neutral-500">Changes the symbol on every amount. Nothing is converted.</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {OPTIONS.map((c) => {
            const active = currency === c
            return (
              <label
                key={c}
                className={`flex cursor-pointer items-center gap-4 border border-black p-5 transition-colors has-[:disabled]:cursor-not-allowed ${
                  active ? 'bg-black text-white' : 'bg-white text-black hover:bg-neutral-50'
                }`}
              >
                {/* Square, like every checkbox; white on the chosen (black) tile. */}
                <input
                  type="radio"
                  name="currency"
                  value={c}
                  checked={active}
                  disabled={setCurrency.isPending}
                  onChange={() => setPending(c)}
                  className={`${squareControlShape} bg-white ${active ? 'border-white' : 'border-black'}`}
                />
                <span>
                  <span className="block font-mono text-2xl font-bold">{c === 'PHP' ? '₱' : '$'}</span>
                  <span className={`block font-mono text-xs uppercase ${active ? 'text-neutral-300' : 'text-neutral-500'}`}>
                    {CURRENCY_LABELS[c]}
                  </span>
                </span>
              </label>
            )
          })}
        </div>

        {unconfirmed && (
          <div className="space-y-1">
            <BrutalFormError>
              That switch didn&rsquo;t confirm. Amounts are showing in {CURRENCY_LABELS[currency]}, which is the last
              value read back &mdash; the change may still have reached the backend. Reload to see what actually saved.
            </BrutalFormError>
            {detail !== '' && <p className="font-mono text-xs text-neutral-500">{detail}</p>}
          </div>
        )}
      </section>

      {pending && (
        <BrutalConfirm
          open
          title="Switch currency"
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
