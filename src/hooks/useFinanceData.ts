import { useQuery } from '@tanstack/react-query'
import { getApi } from '../api/index.ts'
import { isFinanceData } from '../lib/financeShape.ts'
import type { FinanceData } from '../types.ts'

/**
 * A response missing an array crashes inside a render, which no error branch
 * here can catch and which persists into storage. Rejecting it as a failed load
 * puts it in front of LoadError instead, where the message is visible and a
 * reload is one click away.
 */
async function loadFinanceData(): Promise<FinanceData> {
  const data = await getApi().getAll()
  if (!isFinanceData(data)) throw new Error('The backend returned an incomplete dataset.')
  return data
}

export const financeKey = ['finance', 'all'] as const

/*
 * Callers must branch on `isPending`, never `isLoading`. While the persisted
 * cache is being restored, react-query forces fetchStatus to 'idle', so
 * isLoading is false with no data yet — a page keyed on isLoading falls
 * through to its error branch and paints "could not load" on every cold start.
 * isPending is true whenever there is no data, which is the actual question.
 */

export function useFinanceData() {
  return useQuery<FinanceData>({
    queryKey: financeKey,
    queryFn: loadFinanceData,
    // One retry, not the default three: each attempt can take up to the
    // client's 45s timeout, and isLoading stays true across retries — so
    // three of them would hide a real error behind a spinner for minutes.
    retry: 1,
  })
}
