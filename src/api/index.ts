import type { FinanceApi } from './FinanceApi.ts'
import { MockApi } from './mock/MockApi.ts'
import { AppsScriptApi } from './appsScript/AppsScriptApi.ts'

let instance: FinanceApi | null = null

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
