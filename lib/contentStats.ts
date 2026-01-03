export type ContentCategoryKey =
  | 'all'
  | 'locations'
  | 'characters'
  | 'technologies'
  | 'factions'
  | 'events'
  | 'lore'
  | 'reserve'

export type CategoryStat = {
  key: ContentCategoryKey
  title: string
  count: number
  href: string
}

export type CategoryCountMap = Partial<Record<ContentCategoryKey, number>>

function resolveCount(source: CategoryCountMap | undefined, key: ContentCategoryKey): number {
  const value = source?.[key]
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.floor(value))
  }
  return 0
}

// Temporary adapter: replace counts with real sources if available
export function getCategoryStats(overrides?: CategoryCountMap): CategoryStat[] {
  const categories: Array<{ key: ContentCategoryKey; title: string; href: string }> = [
    { key: 'all', title: 'ALL', href: '/dashboard/content/all' },
    { key: 'locations', title: 'LOCATIONS', href: '/dashboard/content/locations' },
    { key: 'characters', title: 'CHARACTERS', href: '/dashboard/content/characters' },
    { key: 'technologies', title: 'TECHNOLOGIES', href: '/dashboard/content/technologies' },
    { key: 'factions', title: 'FACTIONS', href: '/dashboard/content/factions' },
    { key: 'events', title: 'EVENTS', href: '/dashboard/content/events' },
    { key: 'lore', title: 'LORE', href: '/dashboard/content/lore' },
    { key: 'reserve', title: 'RESERVE', href: '/dashboard/content/reserve' },
  ]

  return categories.map((c) => ({
    ...c,
    count: resolveCount(overrides, c.key),
  }))
}
