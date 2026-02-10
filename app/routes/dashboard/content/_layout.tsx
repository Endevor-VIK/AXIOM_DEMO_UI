import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { Outlet, useLocation, useSearchParams } from 'react-router-dom'

import CategoryStats from '@/components/content/CategoryStats'
import ContentFilters from '@/components/ContentFilters'
import RouteWreath from '@/components/counters/RouteWreath'
import { getCategoryStats, type ContentCategoryKey } from '@/lib/contentStats'
import '@/styles/content-library.css'
import {
  contentCategories,
  type ContentAggregate,
  type ContentCategory,
  type ContentCategorySummary,
  type ContentStatus,
  vfs,
} from '@/lib/vfs'
import { buildContentFavorite } from '@/lib/identity/favoritesService'
import { useFavorites } from '@/lib/identity/useFavorites'

import {
  ContentHubContext,
  type ContentLayoutMode,
  type ContentFiltersSnapshot,
  type ContentHubContextValue,
  type ContentViewMode,
} from './context'

const DEFAULT_FILTERS: ContentFiltersSnapshot = {
  query: '',
  tag: '',
  status: 'any',
  lang: 'any',
  layout: 'inspect',
  view: 'list',
}

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

function parseBoolFlag(value: unknown): boolean | null {
  if (value == null) return null
  const raw = String(value).trim().toLowerCase()
  if (!raw) return null
  if (raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on') return true
  if (raw === '0' || raw === 'false' || raw === 'no' || raw === 'off') return false
  return null
}

const ContentLayout: React.FC = () => {
  const [aggregate, setAggregate] = useState<ContentAggregate | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const { favorites, addFavorite, removeFavorite } = useFavorites()
  const aggregateItems = aggregate?.items ?? []

  const dataBase = useMemo(
    () => ensureTrailingSlash(((import.meta as any)?.env?.VITE_DATA_BASE as string) ?? 'data/'),
    []
  )

  const orbitEnabled = useMemo(() => {
    const raw = (import.meta as any)?.env?.VITE_FEATURE_ORBIT_VIEW
    const forced = parseBoolFlag(raw)
    return forced ?? Boolean(import.meta.env.DEV)
  }, [])

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

  const filters = useMemo<ContentFiltersSnapshot>(() => {
    const query = searchParams.get('q') ?? DEFAULT_FILTERS.query
    const tag = searchParams.get('tag') ?? DEFAULT_FILTERS.tag
    const status = parseStatus(searchParams.get('status'))
    const lang = searchParams.get('lang') ?? DEFAULT_FILTERS.lang
    const layoutParam = searchParams.get('layout')
    const layout: ContentLayoutMode = layoutParam === 'browse' ? 'browse' : DEFAULT_FILTERS.layout
    const viewParam = searchParams.get('view')
    let view: ContentViewMode = DEFAULT_FILTERS.view
    if (viewParam === 'list' || viewParam === 'cards' || viewParam === 'orbit') {
      view = viewParam
    }
    if (view === 'orbit' && !orbitEnabled) {
      view = DEFAULT_FILTERS.view
    }
    return { query, tag, status, lang, layout, view }
  }, [orbitEnabled, searchParams])

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
      setLayout: (value: ContentLayoutMode) =>
        updateSearchParam('layout', value === DEFAULT_FILTERS.layout ? null : value),
      setView: (value: ContentViewMode) =>
        updateSearchParam(
          'view',
          value === DEFAULT_FILTERS.view || (value === 'orbit' && !orbitEnabled) ? null : value
        ),
      reset: () => {
        const next = new URLSearchParams(searchParams)
        next.delete('q')
        next.delete('tag')
        next.delete('status')
        next.delete('lang')
        next.delete('layout')
        next.delete('view')
        setSearchParams(next, { replace: true })
      },
    }),
    [filters, orbitEnabled, searchParams, updateSearchParam, setSearchParams]
  )

  const categoryCounts = useMemo<Record<ContentCategoryKey, number>>(() => {
    const base: Record<ContentCategoryKey, number> = {
      all: 0,
      locations: 0,
      characters: 0,
      technologies: 0,
      factions: 0,
      events: 0,
      lore: (aggregate?.lore?.roots?.length ?? 0) > 0 ? 1 : 0,
      reserve: 0,
    }
    for (const it of aggregate?.items ?? []) {
      base.all += 1
      if (it.category in base) {
        const key = it.category as keyof typeof base
        base[key] += 1
      }
    }
    return base
  }, [aggregate])

  // Build a normalized summary map so dependents see consistent counts
  const categories = useMemo<Record<'all' | ContentCategory, ContentCategorySummary>>(() => {
    const src = aggregate?.categories ?? buildEmptyCategories()
    return {
      all:          { ...src.all,          count: categoryCounts.all },
      locations:    { ...src.locations,    count: categoryCounts.locations },
      characters:   { ...src.characters,   count: categoryCounts.characters },
      technologies: { ...src.technologies, count: categoryCounts.technologies },
      factions:     { ...src.factions,     count: categoryCounts.factions },
      events:       { ...src.events,       count: categoryCounts.events },
      lore:         { ...src.lore,         count: categoryCounts.lore },
    }
  }, [aggregate, categoryCounts])

  const activeTab = useMemo(() => parseActiveCategory(location.pathname), [location.pathname])

  const categoryStats = useMemo(() => {
    const persisted = new URLSearchParams(searchParams)
    persisted.delete('item')
    const suffix = persisted.toString()
    const withQuery = (href: string) => (suffix ? `${href}?${suffix}` : href)
    return getCategoryStats(categoryCounts).map((item) => {
      const isReserve = item.key === 'reserve'
      return {
        ...item,
        active: item.key === activeTab,
        disabled: isReserve,
        href: isReserve ? location.pathname : withQuery(item.href),
      }
    })
  }, [categoryCounts, activeTab, location.pathname, searchParams])

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

  const contentTotal = aggregate?.items?.length ?? 0
  const activeCategoryLabel =
    activeTab === 'all'
      ? 'All collections'
      : activeTab.replace(/[-_]/g, ' ')
  const contentWreathDescription = loading
    ? 'Loading content manifests...'
      : contentTotal > 0
        ? `${contentTotal} entries indexed. Focus: ${activeCategoryLabel.toUpperCase()}.`
        : 'No content entries synced yet.'

  const pinnedContentIds = useMemo(
    () =>
      favorites
        .filter((entry) => entry.route?.startsWith('/dashboard/content/'))
        .map((entry) => entry.id),
    [favorites],
  )

  const togglePin = useCallback(
    (id: string) => {
      const existing = favorites.find(
        (entry) => entry.id === id && entry.route?.startsWith('/dashboard/content/'),
      )
      if (existing) {
        removeFavorite(existing.key)
        return
      }
      const content = aggregateItems.find((item) => item.id === id) ?? null
      const favorite = buildContentFavorite({
        id,
        title: content?.title ?? id,
        category: content?.category ?? 'content',
        tags: content?.tags,
        route: `/dashboard/content/all?item=${encodeURIComponent(id)}`,
      })
      addFavorite(favorite)
    },
    [addFavorite, aggregateItems, favorites, removeFavorite],
  )

  const isPinned = useCallback((id: string) => pinnedContentIds.includes(id), [pinnedContentIds])

  const contextValue = useMemo<ContentHubContextValue>(
    () => ({
      aggregate,
      loading,
      error,
      dataBase,
      categories, // было: categoryCounts — теперь корректный тип
      availableTags,
      availableLanguages,
      features: {
        orbitView: orbitEnabled,
      },
      filters: filtersApi,
      pinned: pinnedContentIds,
      togglePin,
      isPinned,
    }),
    [
      aggregate,
      loading,
      error,
      dataBase,
      categories, // keep dependency on computed summaries
      availableTags,
      availableLanguages,
      orbitEnabled,
      filtersApi,
      pinnedContentIds,
      togglePin,
      isPinned,
    ]
  )

  return (
    <ContentHubContext.Provider value={contextValue}>
      <section className='ax-section'>
	        <div
	          className='ax-container ax-content-hub'
	          data-layout-mode={filters.layout}
	          aria-busy={loading}
	        >
	          <RouteWreath
	            label='CONTENT'
	            value={contentTotal}
	            title='Content Library'
	            description={contentWreathDescription}
	            ariaLabel={`CONTENT module total ${contentTotal}`}
	            size={filters.layout === 'inspect' ? 140 : 240}
	            {...(filters.layout === 'inspect' ? { className: 'ax-route-wreath--compact' } : {})}
	          />
	          {/* Category summary table (7 columns including ALL) */}
	          <CategoryStats items={categoryStats} variant='table' />
	          {/* Legacy tile grid removed per spec */}
	          <ContentFilters disabled={Boolean(error)} />
          <div className='ax-content-outlet'>
            {error ? <div className='ax-dashboard__alert' role='alert'>{error}</div> : <Outlet />}
          </div>
        </div>
      </section>
    </ContentHubContext.Provider>
  )
}

export default ContentLayout
