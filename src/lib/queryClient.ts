import { QueryClient } from '@tanstack/react-query'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { anyTempIdsMinted, isTemp } from './tempId.ts'

/**
 * How long fetched data is treated as fresh. The backend is a Google Sheet that
 * can also be edited directly, so this is a compromise rather than Infinity:
 * long enough that normal use never refetches, short enough that an edit made
 * in the sheet shows up on its own within a few minutes.
 */
const STALE_TIME = 5 * 60 * 1000

/**
 * Persisted data older than this is discarded on load rather than shown. Also
 * the in-memory gcTime: a query dropped from the cache is dropped from storage
 * with it, so the two must not disagree.
 */
const CACHE_MAX_AGE = 24 * 60 * 60 * 1000

const CACHE_PREFIX = 'finance.cache.'

/** createSyncStoragePersister's default; mirrored here to outwait it. */
const PERSIST_THROTTLE = 1000

/**
 * Bump when the shape of FinanceData changes. A stored cache with a different
 * buster is thrown away instead of rehydrated, which is what stops an old shape
 * from reaching code that expects the new one.
 */
const CACHE_VERSION = 'v3'

function cacheKey(userId: number): string {
  return `${CACHE_PREFIX}${userId}`
}

export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: STALE_TIME,
        gcTime: CACHE_MAX_AGE,
        // The default refires the whole dataset fetch on every alt-tab back.
        // Against a backend that can take 45s, that is never worth it.
        refetchOnWindowFocus: false,
      },
    },
  })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/**
 * Optimistic rows must not outlive the write that created them. A tab closed
 * mid-write would otherwise rehydrate a row with a temp id that no backend row
 * corresponds to — permanent, and inert against every action, since the UI
 * disables a pending row's actions by design.
 *
 * Stripping on the way in means storage never holds one, so nothing has to
 * recognise a stale temp row on the way out.
 */
function withoutTempRows(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value
      .filter((item) => !(isRecord(item) && typeof item.id === 'number' && isTemp(item.id)))
      .map(withoutTempRows)
  }
  if (isRecord(value)) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, withoutTempRows(v)]))
  }
  return value
}

/**
 * Storage is keyed by user: one signed-in account must never rehydrate another
 * account's data on a shared browser.
 */
export function persistOptionsFor(userId: number) {
  return {
    persister: createSyncStoragePersister({
      storage: window.localStorage,
      key: cacheKey(userId),
      // The walk rebuilds the whole dataset, so it is skipped in the common case:
      // a session that never created anything has no temp row to strip.
      serialize: (client) =>
        JSON.stringify(anyTempIdsMinted() ? withoutTempRows(client) : client),
    }),
    maxAge: CACHE_MAX_AGE,
    buster: CACHE_VERSION,
  }
}

/** Signing out is explicit: drop the stored copy rather than leave it on disk. */
export function clearPersistedCache(userId: number): void {
  const key = cacheKey(userId)
  localStorage.removeItem(key)
  /*
   * The persister throttles writes on a trailing timer it never cancels, so a
   * write scheduled in the second before sign-out lands after this removal and
   * puts the whole dataset back. Clear again once that window has closed.
   */
  window.setTimeout(() => localStorage.removeItem(key), PERSIST_THROTTLE + 100)
}
