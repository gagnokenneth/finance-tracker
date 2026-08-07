import { useQuery } from '@tanstack/react-query'
import { getApi } from '../api/index.ts'
import type { FinanceData } from '../types.ts'

export const financeKey = ['finance', 'all'] as const

export function useFinanceData() {
  return useQuery<FinanceData>({
    queryKey: financeKey,
    queryFn: () => getApi().getAll(),
    // One retry, not the default three: each attempt can take up to the
    // client's 45s timeout, and isLoading stays true across retries — so
    // three of them would hide a real error behind a spinner for minutes.
    retry: 1,
  })
}
