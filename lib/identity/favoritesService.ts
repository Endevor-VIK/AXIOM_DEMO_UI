import type { FavoriteItem, FavoriteType } from './types'

const FAVORITES_KEY = 'ax_favorites_v1'
const LEGACY_PINS_KEY = 'axiom.content.pins'

type FavoritesListener = (items: FavoriteItem[]) => void

const listeners = new Set<FavoritesListener>()
let legacyChecked = false

export function makeFavoriteKey(type: FavoriteType, id: string): string {
  return `${type}:${id}`
}

export function favoriteTypeFromCategory(category?: string | null): FavoriteType {
  const normalized = (category || '').toLowerCase()
  if (normalized.includes('character')) return 'character'
  if (normalized.includes('location')) return 'location'
  if (normalized.includes('technolog')) return 'technology'
  if (normalized.includes('faction')) return 'faction'
  if (normalized.includes('event')) return 'event'
  if (normalized.includes('lore')) return 'lore'
  if (normalized.includes('content')) return 'content'
  return 'other'
}

export function buildContentFavorite(input: {
  id: string
  title: string
  category?: string | null | undefined
  tags?: string[] | undefined
  route?: string | undefined
}): FavoriteItem {
  const type = favoriteTypeFromCategory(input.category ?? 'content')
  const now = new Date().toISOString()
  const title = input.title || input.id
  const route = input.route ?? `/dashboard/content/all?item=${encodeURIComponent(input.id)}`
  const tags = input.tags?.filter((tag) => typeof tag === 'string') ?? null
  return {
    key: makeFavoriteKey(type, input.id),
    id: input.id,
    type,
    title,
    route,
    createdAt: now,
    updatedAt: now,
    ...(tags && tags.length ? { tags } : {}),
  }
}

function ensureSafeArray(value: unknown): FavoriteItem[] {
  if (!Array.isArray(value)) return []
  return value
    .map((entry) => sanitizeFavorite(entry))
    .filter((entry): entry is FavoriteItem => Boolean(entry))
}

function sanitizeFavorite(raw: any): FavoriteItem | null {
  const key = typeof raw?.key === 'string' && raw.key.trim() ? raw.key.trim() : null
  const id = typeof raw?.id === 'string' && raw.id.trim() ? raw.id.trim() : null
  const type =
    raw?.type === 'character' ||
    raw?.type === 'location' ||
    raw?.type === 'technology' ||
    raw?.type === 'faction' ||
    raw?.type === 'event' ||
    raw?.type === 'lore' ||
    raw?.type === 'other' ||
    raw?.type === 'content'
      ? (raw.type as FavoriteType)
      : null
  const title = typeof raw?.title === 'string' && raw.title.trim() ? raw.title.trim() : null
  const route = typeof raw?.route === 'string' && raw.route.trim() ? raw.route.trim() : null
  const tags = Array.isArray(raw?.tags)
    ? (raw.tags.filter((tag: unknown) => typeof tag === 'string') as string[])
    : null
  if (!key || !id || !type || !title || !route) return null
  return {
    key,
    id,
    type,
    title,
    route,
    createdAt: typeof raw?.createdAt === 'string' ? raw.createdAt : new Date().toISOString(),
    updatedAt: typeof raw?.updatedAt === 'string' ? raw.updatedAt : new Date().toISOString(),
    ...(tags && tags.length ? { tags } : {}),
  }
}

function notify(items?: FavoriteItem[]): void {
  const payload = items ?? list()
  listeners.forEach((listener) => {
    try {
      listener(payload)
    } catch {
      // ignore listener errors
    }
  })
}

function persistFavorites(items: FavoriteItem[]): FavoriteItem[] {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(items))
    } catch {
      // ignore quota errors
    }
  }
  notify(items)
  return items
}

function readFavorites(): FavoriteItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(FAVORITES_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return ensureSafeArray(parsed)
  } catch {
    return []
  }
}

function migrateLegacyPins(): FavoriteItem[] {
  if (legacyChecked) return readFavorites()
  legacyChecked = true
  if (typeof window === 'undefined') return []
  const current = readFavorites()
  if (current.length) return current
  try {
    const raw = window.localStorage.getItem(LEGACY_PINS_KEY)
    if (!raw) return current
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed) || !parsed.length) return current
    const now = new Date().toISOString()
    const migrated = parsed
      .filter((id) => typeof id === 'string' && id.trim())
      .map((id) => ({
        key: makeFavoriteKey('content', id),
        id,
        type: 'content' as FavoriteType,
        title: id,
        route: `/dashboard/content/all?item=${encodeURIComponent(id)}`,
        createdAt: now,
        updatedAt: now,
      }))
    return persistFavorites(migrated)
  } catch {
    return current
  }
}

export function list(): FavoriteItem[] {
  const current = readFavorites()
  if (current.length) return current
  if (legacyChecked) return current
  return migrateLegacyPins()
}

export function subscribeFavorites(listener: FavoritesListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function isPinned(key: string): boolean {
  return list().some((entry) => entry.key === key)
}

export function add(item: FavoriteItem): FavoriteItem[] {
  const now = new Date().toISOString()
  const nextTags = Array.isArray(item.tags) ? item.tags : undefined
  const next: FavoriteItem = {
    ...item,
    key: item.key || makeFavoriteKey(item.type, item.id),
    createdAt: item.createdAt ?? now,
    updatedAt: now,
    ...(nextTags ? { tags: nextTags } : {}),
  }
  const items = list()
  const existingIndex = items.findIndex((entry) => entry.key === next.key)
  if (existingIndex >= 0) {
    const current = items[existingIndex]!
    items[existingIndex] = { ...current, ...next, createdAt: current.createdAt }
    return persistFavorites(items)
  }
  return persistFavorites([next, ...items])
}

export function remove(key: string): FavoriteItem[] {
  const items = list().filter((entry) => entry.key !== key)
  return persistFavorites(items)
}

export function clear(): FavoriteItem[] {
  return persistFavorites([])
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === FAVORITES_KEY || event.key === LEGACY_PINS_KEY) {
      notify()
    }
  })
}
