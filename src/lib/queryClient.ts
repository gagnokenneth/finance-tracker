import { QueryClient } from '@tanstack/react-query'
import type { PersistedClient } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { anyTempIdsMinted, isTemp } from './tempId.ts'
import { isFinanceData } from './financeShape.ts'

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
const CACHE_VERSION = 'v6'

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
 *
 * Reports whether it removed anything, because a snapshot it altered is no longer
 * a faithful copy of what the client had — see markStrippedStale.
 */
function withoutTempRows(value: unknown, removed: { any: boolean }): unknown {
  if (Array.isArray(value)) {
    const kept = value.filter(
      (item) => !(isRecord(item) && typeof item.id === 'number' && isTemp(item.id)),
    )
    if (kept.length !== value.length) removed.any = true
    return kept.map((item) => withoutTempRows(item, removed))
  }
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, withoutTempRows(v, removed)]),
    )
  }
  return value
}

/**
 * onMutate stamps the cache as freshly updated, so a snapshot taken while a
 * create was in flight looks current while missing the row being created. If the
 * write then succeeded and the tab never saw the answer, the next load would show
 * that snapshot as fresh for STALE_TIME — the new row simply absent, with focus
 * refetching off to bring it back, and the obvious reaction being to add it
 * again.
 *
 * Zeroing dataUpdatedAt on the queries we altered makes them stale instead: the
 * data still paints immediately, and a refetch corrects it on mount.
 */
function markStrippedStale(client: unknown): unknown {
  if (!isRecord(client)) return client
  const state = client.clientState
  if (!isRecord(state) || !Array.isArray(state.queries)) return client
  return {
    ...client,
    clientState: {
      ...state,
      queries: state.queries.map((query) =>
        isRecord(query) && isRecord(query.state)
          ? { ...query, state: { ...query.state, dataUpdatedAt: 0 } }
          : query,
      ),
    },
  }
}

/**
 * Drops a stored query whose data is not a usable dataset, rather than handing it
 * to the app.
 *
 * The buster only catches shapes this build knows are old. It cannot catch a
 * dataset that was stored incomplete — and an incomplete one is unrecoverable
 * without this: every page indexes straight into its arrays, so the render throws
 * on rehydration, before any code that could refetch or repair runs. The app is
 * then white on every load, and clearing localStorage by hand is the only way
 * out. Dropping the query instead leaves the app with no data, which is a state
 * it already handles — it fetches.
 *
 * Only the dataset query is ever persisted, so every query here is expected to
 * hold one. A query with no data yet is kept as it is.
 */
function withoutMalformedQueries(client: unknown): unknown {
  if (!isRecord(client)) return client
  const state = client.clientState
  if (!isRecord(state) || !Array.isArray(state.queries)) return client
  return {
    ...client,
    clientState: {
      ...state,
      queries: state.queries.filter((query) => {
        if (!isRecord(query) || !isRecord(query.state)) return false
        const data = query.state.data
        return data === undefined || isFinanceData(data)
      }),
    },
  }
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
      /*
       * The walk rebuilds the whole client, so it is skipped until this session
       * has minted its first temp id — after which it runs on every persist,
       * since nothing tells us the last prediction has been reconciled.
       */
      serialize: (client) => {
        if (!anyTempIdsMinted()) return JSON.stringify(client)
        const removed = { any: false }
        const stripped = withoutTempRows(client, removed)
        return JSON.stringify(removed.any ? markStrippedStale(stripped) : stripped)
      },
      deserialize: (cached) => withoutMalformedQueries(JSON.parse(cached)) as PersistedClient,
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
