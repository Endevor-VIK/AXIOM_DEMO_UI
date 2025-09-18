import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { Outlet, useLocation, useSearchParams } from 'react-router-dom'

import ContentCategoryTiles, {
  type CategoryKey,
  type CategoryStat,
} from '@/components/ContentCategoryTiles'
import ContentFilters from '@/components/ContentFilters'
import {
  contentCategories,
  type ContentAggregate,
  type ContentCategory,
  type ContentCategorySummary,
  type ContentStatus,
  vfs,
} from '@/lib/vfs'

import {
  ContentHubContext,
  type ContentFiltersSnapshot,
  type ContentHubContextValue,
  type ContentViewMode,
} from './context'

const PIN_STORAGE_KEY = 'axiom.content.pins'
const DEFAULT_FILTERS: ContentFiltersSnapshot = {
  query: '',
  tag: '',
  status: 'any',
  lang: 'any',
  view: 'cards',
}

const CATEGORY_LABELS: Record<CategoryKey, string> = {
  all: 'All',
  locations: 'Locations',
  characters: 'Characters',
  technologies: 'Technologies',
  factions: 'Factions',
  events: 'Events',
  lore: 'Lore',
}

const CATEGORY_ORDER: CategoryKey[] = [
  'all',
  'locations',
  'characters',
  'technologies',
  'factions',
  'events',
  'lore',
]

function ensureTrailingSlash(value: string): string {
  return value.endsWith('/') ? value : value + '/'
}

function buildEmptyCategories(): Record<'all' | ContentCategory, ContentCategorySummary> {
  return {
    all: { count: 0, manifest: 'content/manifest.json' },
    locations: { count: 0, manifest: 'content/locations/manifest.json' },
    characters: { count: 0, manifest: 'content/characters/manifest.json' },
    technologies: { count: 0, manifest: 'content/technologies/manifest.json' },
    factions: { count: 0, manifest: 'content/factions/manifest.json' },
    events: { count: 0, manifest: 'content/events/manifest.json' },
    lore: { count: 0, manifest: 'content/lore/_index.json' },
  }
}

function parseActiveCategory(pathname: string): 'all' | ContentCategory {
  const normalized = pathname.replace(/\/+$/, '')
  const parts = normalized.split('/')
  const idx = parts.indexOf('content')
  if (idx >= 0 && parts.length > idx + 1) {
    const seg = parts[idx + 1]
    if (seg === 'all') return 'all'
    if (seg === 'lore') return 'lore'
    if (contentCategories.includes(seg as ContentCategory)) {
      return seg as ContentCategory
    }
  }
  return 'all'
}

function parseStatus(raw: string | null): ContentStatus | 'any' {
  if (raw === 'draft' || raw === 'published' || raw === 'archived') return raw
  return 'any'
}

function loadPins(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(PIN_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed.filter((id) => typeof id === 'string') as string[]) : []
  } catch {
    return []
  }
}

const ContentLayout: React.FC = () => {
  const [aggregate, setAggregate] = useState<ContentAggregate | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const [pins, setPins] = useState<string[]>(loadPins)
  const location = useLocation()

  const dataBase = useMemo(
    () => ensureTrailingSlash(((import.meta as any)?.env?.VITE_DATA_BASE as string) ?? 'data/'),
    []
  )

  useEffect(() => {
    let alive = true
    setLoading(true)
    vfs
      .readContentAggregate()
      .then((agg) => {
        if (!alive) return
        setAggregate(agg)
        setError(null)
      })
      .catch((err) => {
        if (!alive) return
        setError(err instanceof Error ? err.message : String(err))
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(PIN_STORAGE_KEY, JSON.stringify(pins))
    } catch {
      // ignore quota errors
    }
  }, [pins])

  const filters = useMemo<ContentFiltersSnapshot>(() => {
    const query = searchParams.get('q') ?? DEFAULT_FILTERS.query
    const tag = searchParams.get('tag') ?? DEFAULT_FILTERS.tag
    const status = parseStatus(searchParams.get('status'))
    const lang = searchParams.get('lang') ?? DEFAULT_FILTERS.lang
    const viewParam = searchParams.get('view')
    const view: ContentViewMode = viewParam === 'list' ? 'list' : DEFAULT_FILTERS.view
    return { query, tag, status, lang, view }
  }, [searchParams])

  const updateSearchParam = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(searchParams)
      if (!value || value === 'any' || value === '') next.delete(key)
      else next.set(key, value)
      setSearchParams(next, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  const filtersApi = useMemo<ContentHubContextValue['filters']>(
    () => ({
      ...filters,
      setQuery: (value: string) => updateSearchParam('q', value),
      setTag: (value: string) => updateSearchParam('tag', value),
      setStatus: (value: ContentStatus | 'any') =>
        updateSearchParam('status', value === 'any' ? null : value),
      setLang: (value: string | 'any') =>
        updateSearchParam('lang', value === 'any' ? null : value),
      setView: (value: ContentViewMode) =>
        updateSearchParam('view', value === DEFAULT_FILTERS.view ? null : value),
      reset: () => {
        const next = new URLSearchParams(searchParams)
        next.delete('q')
        next.delete('tag')
        next.delete('status')
        next.delete('lang')
        next.delete('view')
        setSearchParams(next, { replace: true })
      },
    }),
    [filters, searchParams, updateSearchParam, setSearchParams]
  )

  const categories = useMemo(
    () => aggregate?.categories ?? buildEmptyCategories(),
    [aggregate]
  )

  const categoryTiles = useMemo<CategoryStat[]>(() => {
    if (!aggregate) return []
    const source = aggregate.categories
    return CATEGORY_ORDER.map((key) => ({
      key,
      title: CATEGORY_LABELS[key],
      count: source[key].count,
      to: key === 'all' ? 'all' : key,
    }))
  }, [aggregate])

  const availableTags = useMemo(() => {
    if (!aggregate) return []
    const bag = new Set<string>()
    for (const item of aggregate.items) {
      if (Array.isArray(item.tags)) {
        for (const tag of item.tags) bag.add(tag)
      }
    }
    return Array.from(bag).sort((a, b) => a.localeCompare(b))
  }, [aggregate])

  const availableLanguages = useMemo(() => {
    if (!aggregate) return []
    const bag = new Set<string>()
    for (const item of aggregate.items) {
      if (typeof item.lang === 'string' && item.lang.trim()) bag.add(item.lang.trim())
    }
    return Array.from(bag).sort((a, b) => a.localeCompare(b))
  }, [aggregate])

  const togglePin = useCallback((id: string) => {
    setPins((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }, [])

  const isPinned = useCallback((id: string) => pins.includes(id), [pins])

  const activeTab = useMemo(() => parseActiveCategory(location.pathname), [location.pathname])

  const contextValue = useMemo<ContentHubContextValue>(
    () => ({
      aggregate,
      loading,
      error,
      dataBase,
      categories,
      availableTags,
      availableLanguages,
      filters: filtersApi,
      pinned: pins,
      togglePin,
      isPinned,
    }),
    [
      aggregate,
      loading,
      error,
      dataBase,
      categories,
      availableTags,
      availableLanguages,
      filtersApi,
      pins,
      togglePin,
      isPinned,
    ]
  )

  return (
    <ContentHubContext.Provider value={contextValue}>
      <section className="ax-content-hub" aria-busy={loading}>
        <ContentCategoryTiles items={categoryTiles} active={activeTab} loading={loading} />
        <ContentFilters disabled={Boolean(error)} />
        <div className="ax-content-outlet">
          {error ? <div className="ax-err" role="alert">{error}</div> : <Outlet />}
        </div>
      </section>
    </ContentHubContext.Provider>
  )
}

export default ContentLayout

