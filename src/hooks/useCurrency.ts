import { useEffect } from 'react'
import { useFinanceData } from './useFinanceData.ts'
import { useAuth } from '../auth/useAuth.ts'
import { DEFAULT_CURRENCY, readCachedCurrency, writeCachedCurrency } from '../lib/currency.ts'
import type { Currency } from '../types.ts'

/**
 * The active currency. The backend Settings sheet is the source of truth; the
 * localStorage cache supplies a correct symbol on first paint, before data has
 * loaded. Derived during render rather than held in state, so no effect ever
 * calls setState.
 */
export function useCurrency(): Currency {
  const { data } = useFinanceData()
  const { user } = useAuth()
  const userId = user?.id
  const fromServer = data?.settings.currency
  const currency = fromServer ?? readCachedCurrency(userId) ?? DEFAULT_CURRENCY

  useEffect(() => {
    if (fromServer && userId !== undefined) writeCachedCurrency(userId, fromServer)
  }, [fromServer, userId])

  return currency
}
