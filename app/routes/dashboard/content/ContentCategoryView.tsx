import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'

import ContentList from '@/components/ContentList'
import { trackContentView } from '@/lib/analytics'
import type { ContentCategory, ContentItem, ContentStatus } from '@/lib/vfs'
import ContentPreview from '@/src/features/content/components/ContentPreview'
import type { ContentPreviewData } from '@/src/features/content/types'
import '@/styles/content-hub-v2.css'

import { useContentHub } from './context'

function matchesQuery(item: ContentItem, query: string): boolean {
  const term = query.trim().toLowerCase()
  if (!term) return true
  const haystack = [
    item.title,
    item.summary,
    item.author,
    item.id,
    (item.tags ?? []).join(' '),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return haystack.includes(term)
}

function matchesTag(item: ContentItem, tag: string): boolean {
  if (!tag) return true
  const tags = item.tags ?? []
  return tags.includes(tag)
}

function matchesStatus(item: ContentItem, status: ContentStatus | 'any'): boolean {
  if (status === 'any') return true
  return item.status === status
}

function matchesLang(item: ContentItem, lang: string | 'any'): boolean {
  if (lang === 'any') return true
  return (item.lang ?? '').toLowerCase() === lang.toLowerCase()
}

function filterByCategory(items: ContentItem[], category: 'all' | ContentCategory): ContentItem[] {
  if (category === 'all') return items
  return items.filter((content) => content.category === category)
}

function orderByPins(items: ContentItem[], pinned: string[]): ContentItem[] {
  if (!pinned.length) return items
  const set = new Set(pinned)
  const pinnedItems: ContentItem[] = []
  const rest: ContentItem[] = []
  for (const entry of items) {
    if (set.has(entry.id)) pinnedItems.push(entry)
    else rest.push(entry)
  }
  return [...pinnedItems, ...rest]
}

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : true,
  )

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia(query)
    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches)
    setMatches(mq.matches)
    mq.addEventListener?.('change', onChange)
    return () => mq.removeEventListener?.('change', onChange)
  }, [query])

  return matches
}

export interface ContentCategoryViewProps {
  category: 'all' | ContentCategory
}

const noop = () => {}

function pickImage(item: ContentItem): string {
  const cover = item.cover
  if (typeof cover === 'string' && cover.trim()) return cover
  if (item.id === 'CHR-AXIOM-0303') return '/assets/content/03.03_AXIOM.png'
  if (item.id === 'CHR-VIKTOR-0301') return '/assets/content/03.00_VIKTOR.png'
  return '/assets/content/03.03_AXIOM.png'
}

function mapToPreview(entry: ContentItem | null): ContentPreviewData | null {
  if (!entry) return null
  const meta = (entry.meta as Record<string, unknown>) || {}
  const rawVersion = entry.version || (meta.fileVersion as string | undefined) || 'v1.0'
  const rawZone = (meta.zone as string | undefined) || entry.category
  const rawStatus = (meta.fileStatus as string | undefined) || entry.status
  const rawClass = entry.subCategory || entry.category
  const normalizeLabel = (value: string, fallback: string) => {
    const base = value?.trim?.() ? value : fallback
    return String(base).replace(/[_-]+/g, ' ').toUpperCase()
  }
  const version = rawVersion
  const zone = normalizeLabel(rawZone, entry.category.toUpperCase())
  const statusLabel = normalizeLabel(rawStatus, entry.status)
  const classLabel = normalizeLabel(rawClass, entry.category)
  const summary = entry.summary || ''
  const markers =
    (entry.tags && entry.tags.length
      ? entry.tags.slice(0, 3)
      : summary
          .split('.')
          .map((x) => x.trim())
          .filter(Boolean)
          .slice(0, 3)) || []

  return {
    id: entry.id,
    slug: (entry as any).slug || entry.id.toLowerCase(),
    title: entry.title,
    zone,
    category: entry.category,
    status: entry.status,
    lang: entry.lang || 'ru',
    version,
    tags: entry.tags || [],
    preview: {
      kicker: `STATUS: ${statusLabel} · CLASS: ${classLabel}`,
      logline: summary || entry.title,
      markers: markers.length ? markers : ['Content preview'],
      signature: [
        `Author: ${entry.author || 'AXIOM'}`,
        `Version: ${version}`,
        `Status: ${statusLabel}`,
      ],
      image: pickImage(entry),
    },
  }
}

const ContentCategoryView: React.FC<ContentCategoryViewProps> = ({ category }) => {
  const { aggregate, loading, error, filters, pinned, togglePin, isPinned } = useContentHub()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const previewRef = useRef<HTMLDivElement | null>(null)
  const lastScrolledId = useRef<string | null>(null)
  const lastTrackedId = useRef<string | null>(null)

  const items = useMemo(() => {
    if (!aggregate) return []
    return filterByCategory(aggregate.items, category)
      .filter((item) => matchesQuery(item, filters.query))
      .filter((item) => matchesTag(item, filters.tag))
      .filter((item) => matchesStatus(item, filters.status))
      .filter((item) => matchesLang(item, filters.lang))
  }, [aggregate, category, filters])

  const ordered = useMemo(() => orderByPins(items, pinned), [items, pinned])
  const itemParam = searchParams.get('item') ?? ''
  const isDesktop = useMediaQuery('(min-width: 1024px)')

  useEffect(() => {
    if (!ordered.length) {
      return
    }

    if (itemParam && ordered.some((entry) => entry.id === itemParam)) {
      return
    }

    const fallbackId = ordered[0]?.id
    if (!fallbackId) return

    const next = new URLSearchParams(searchParams)
    if (next.get('item') === fallbackId) return
    next.set('item', fallbackId)
    setSearchParams(next, { replace: true })
  }, [ordered, itemParam, searchParams, setSearchParams])

  const selectedItem = useMemo(() => {
    if (!ordered.length) return null
    if (itemParam) {
      const match = ordered.find((entry) => entry.id === itemParam)
      if (match) return match
    }
    return ordered[0] ?? null
  }, [ordered, itemParam])
  const previewEntry = useMemo(() => mapToPreview(selectedItem), [selectedItem])

  useEffect(() => {
    if (!selectedItem) return
    if (lastTrackedId.current === selectedItem.id) return
    lastTrackedId.current = selectedItem.id
    trackContentView({
      id: selectedItem.id,
      category: selectedItem.category,
      renderMode: selectedItem.renderMode ?? 'plain',
      lang: selectedItem.lang ?? null,
      source: isDesktop ? 'list' : 'reader',
    })
  }, [selectedItem, isDesktop])

  useEffect(() => {
    if (!isDesktop) return
    if (!selectedItem) return
    if (typeof window === 'undefined') return
    if (!previewRef.current) return

    const previousId = lastScrolledId.current
    lastScrolledId.current = selectedItem.id

    if (!previousId || previousId === selectedItem.id) return
    const rect = previewRef.current.getBoundingClientRect()
    const stickyTop = 96
    const withinViewport = rect.top >= stickyTop && rect.bottom <= window.innerHeight
    if (!withinViewport) {
      previewRef.current.scrollIntoView({
        behavior: 'smooth',
        block: rect.top < stickyTop ? 'start' : 'center',
      })
    }
  }, [selectedItem, isDesktop])

  const handleSelect = useCallback(
    (item: ContentItem) => {
      const next = new URLSearchParams(searchParams)
      if (next.get('item') !== item.id) {
        next.set('item', item.id)
        setSearchParams(next, { replace: true })
      }
      if (!isDesktop) {
        const nextSearch = next.toString()
        const suffix = nextSearch ? `?${nextSearch}` : ''
        const target = `/content/${item.id}${suffix}`
        navigate(target, {
          state: { from: `${location.pathname}${suffix}` },
        })
      }
    },
    [isDesktop, searchParams, setSearchParams, navigate, location.pathname],
  )

  const handleOpenSource = useCallback(
    (id: string) => {
      const targetItem = ordered.find((entry) => entry.id === id) ?? selectedItem
      if (!targetItem) return
      const next = new URLSearchParams(searchParams)
      next.set('item', targetItem.id)
      const suffix = next.toString()
      const query = suffix ? `?${suffix}` : ''
      navigate(`/content/${targetItem.id}${query}`, {
        state: { from: `${location.pathname}${query}` },
      })
    },
    [location.pathname, navigate, ordered, searchParams, selectedItem],
  )

  const handleTogglePin = useCallback(
    (item: ContentItem) => {
      togglePin(item.id)
    },
    [togglePin],
  )

  const handleIsPinned = useCallback(
    (item: ContentItem) => isPinned(item.id),
    [isPinned],
  )

  if (loading) {
    return (
      <div className='ax-content-split'>
        <div className='ax-content-column list'>
          <ContentList items={[]} selectedId={null} onSelect={noop} />
        </div>
        {isDesktop ? (
          <aside className='ax-panel-right' aria-label='Preview panel'>
            <div className='ax-preview-panel ax-preview-panel--v2' ref={previewRef} role='region' aria-label='Content preview'>
              <ContentPreview entry={null} />
            </div>
          </aside>
        ) : null}
      </div>
    )
  }

  if (error) {
    return <p className='ax-muted'>Unable to load content right now.</p>
  }

  if (!ordered.length) {
    return <p className='ax-muted'>No content found in this category.</p>
  }

  return (
    <div className='ax-content-split'>
      <div className='ax-content-column list'>
        <ContentList
          items={ordered}
          selectedId={selectedItem?.id ?? null}
          onSelect={handleSelect}
          onTogglePin={handleTogglePin}
          isPinned={handleIsPinned}
        />
      </div>
      {isDesktop ? (
        <aside className='ax-panel-right' aria-label='Preview panel'>
          <div className='ax-preview-panel ax-preview-panel--v2' ref={previewRef} role='region' aria-label='Content preview'>
            <ContentPreview entry={previewEntry} onOpenSource={(id) => handleOpenSource(id)} />
          </div>
        </aside>
      ) : null}
    </div>
  )
}

export default ContentCategoryView
