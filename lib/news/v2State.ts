// AXIOM_DEMO_UI — WEB CORE
// Canvas: C33 — lib/news/v2State.ts
// Purpose: NEWS v2 client-side UI-state helpers (localStorage keying + sets + "new since last visit").

export type NewsV2Keys = {
  lastSeenAt: string
  readIds: string
  pinnedIds: string
}

export function newsV2Keys(userId?: string | null): NewsV2Keys {
  const prefix = userId ? `news.${userId}.` : 'news.'
  return {
    lastSeenAt: `${prefix}last_seen_at`,
    readIds: `${prefix}read_ids`,
    pinnedIds: `${prefix}pinned_ids`,
  }
}

function safeJsonParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function readIdSet(storage: Storage | undefined, key: string): Set<string> {
  if (!storage) return new Set()
  const parsed = safeJsonParse<unknown>(storage.getItem(key), [])
  if (!Array.isArray(parsed)) return new Set()
  return new Set(parsed.map((value) => String(value)).filter(Boolean))
}

export function writeIdSet(storage: Storage | undefined, key: string, value: Set<string>): void {
  if (!storage) return
  storage.setItem(key, JSON.stringify(Array.from(value)))
}

export function readTimestamp(storage: Storage | undefined, key: string): string | null {
  if (!storage) return null
  const raw = storage.getItem(key)
  return raw ? String(raw) : null
}

export function writeTimestamp(storage: Storage | undefined, key: string, value: string): void {
  if (!storage) return
  storage.setItem(key, value)
}

export function parseDateMs(value: string | null | undefined): number | null {
  if (!value) return null
  const ms = Date.parse(value)
  return Number.isFinite(ms) ? ms : null
}

export function countNewSince<T extends { date?: string | null }>(
  items: T[],
  lastSeenAt: string | null
): number {
  if (!items.length) return 0
  const lastSeenMs = parseDateMs(lastSeenAt) ?? null
  // If lastSeen is missing/invalid, treat everything as "new" for V1.
  if (!lastSeenMs) return items.filter((it) => it.date).length
  return items.reduce((acc, it) => {
    const itemMs = parseDateMs(it.date ?? null)
    if (itemMs && itemMs > lastSeenMs) return acc + 1
    return acc
  }, 0)
}

