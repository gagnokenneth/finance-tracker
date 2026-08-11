/**
 * Ids for rows that exist only in the cache, while the write that creates them
 * is in flight.
 *
 * Negative, because a real id is always at least 1: both backends assign
 * max(id) + 1 starting from zero (Code.gs:549, MockApi.ts:52). The sign is
 * therefore a reliable test for "the backend has never seen this row".
 *
 * The client cannot predict the real id — nextId maxes over the whole sheet,
 * including rows belonging to other users, which this client never sees.
 */
let last = 0

/** A fresh temp id, never reused within a session. */
export function tempId(): number {
  return --last
}

export function isTemp(id: number): boolean {
  return id < 0
}

/**
 * Whether this session has ever minted one. Lets a caller skip work that only
 * matters when temp rows can exist — which is most sessions, since a session that
 * never creates anything never mints an id.
 */
export function anyTempIdsMinted(): boolean {
  return last < 0
}
