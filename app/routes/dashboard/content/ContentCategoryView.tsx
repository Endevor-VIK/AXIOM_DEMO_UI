import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'

import ContentList from '@/components/ContentList'
import PreviewPane from '@/components/PreviewPane'
import type { ContentCategory, ContentItem, ContentStatus } from '@/lib/vfs'

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

const ContentCategoryView: React.FC<ContentCategoryViewProps> = ({ category }) => {
  const { aggregate, loading, error, filters, dataBase, pinned, togglePin, isPinned } = useContentHub()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const previewRef = useRef<HTMLDivElement | null>(null)
  const lastScrolledId = useRef<string | null>(null)

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
        const target = `/dashboard/content/read/${item.id}${suffix}`
        navigate(target, {
          state: { from: `${location.pathname}${suffix}` },
        })
      }
    },
    [isDesktop, searchParams, setSearchParams, navigate, location.pathname],
  )

  const handleExpand = useCallback(
    (item: ContentItem) => {
      const next = new URLSearchParams(searchParams)
      next.set('item', item.id)
      const suffix = next.toString()
      const query = suffix ? `?${suffix}` : ''
      const target = `/dashboard/content/read/${item.id}${query}`
      navigate(target, {
        state: { from: `${location.pathname}${query}` },
      })
    },
    [location.pathname, navigate, searchParams],
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
            <div className='ax-preview-panel' ref={previewRef} role='region' aria-label='Content preview'>
              <PreviewPane item={null} dataBase={dataBase} />
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
          <div className='ax-preview-panel' ref={previewRef} role='region' aria-label='Content preview'>
            <PreviewPane item={selectedItem} dataBase={dataBase} onExpand={handleExpand} />
          </div>
        </aside>
      ) : null}
    </div>
  )
}

export default ContentCategoryView
