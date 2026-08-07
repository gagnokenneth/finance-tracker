import type { FinanceApi } from './FinanceApi.ts'
import { MockApi } from './mock/MockApi.ts'
import { AppsScriptApi } from './appsScript/AppsScriptApi.ts'

let instance: FinanceApi | null = null

/**
 * True when requests go to the real Apps Script backend. Mock mode skips the
 * invite code, so the sign-up form hides that field.
 */
export function isLiveApi(): boolean {
  return (
    import.meta.env.VITE_API_MODE === 'live' && Boolean(import.meta.env.VITE_APPS_SCRIPT_URL)
  )
}

export function getApi(): FinanceApi {
  if (instance) return instance
  const mode = import.meta.env.VITE_API_MODE ?? 'mock'
  const url = import.meta.env.VITE_APPS_SCRIPT_URL
  if (mode === 'live' && url) {
    instance = new AppsScriptApi(url)
  } else {
    if (mode === 'live') {
      console.warn('VITE_API_MODE=live but VITE_APPS_SCRIPT_URL is missing; using mock.')
    }
    instance = new MockApi()
  }
  return instance
}

export type { FinanceApi } from './FinanceApi.ts'
