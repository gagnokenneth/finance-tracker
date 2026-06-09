import type { FinanceApi } from './FinanceApi.ts'
import { MockApi } from './mock/MockApi.ts'

let instance: FinanceApi | null = null

export function getApi(): FinanceApi {
  if (instance) return instance
  const mode = import.meta.env.VITE_API_MODE ?? 'mock'
  if (mode === 'live') {
    // AppsScriptApi arrives in Plan 3; until then, warn and use mock.
    console.warn('VITE_API_MODE=live but AppsScriptApi is not implemented yet; using mock.')
  }
  instance = new MockApi()
  return instance
}

export type { FinanceApi } from './FinanceApi.ts'
