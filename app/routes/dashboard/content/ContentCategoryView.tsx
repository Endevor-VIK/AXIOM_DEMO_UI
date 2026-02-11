import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'

import ContentList from '@/components/ContentList'
import OrbitView from '@/components/content/OrbitView'
import { trackContentView } from '@/lib/analytics'
import type { ContentCategory, ContentItem, ContentStatus } from '@/lib/vfs'
import '@/styles/content-hub-v2.css'

import { useContentHub } from './context'
import ContentCardsGrid from './ContentCardsGrid'
import ContentDetailsPanel from './ContentDetailsPanel'
import { mapToPreview } from './contentUtils'

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
  const { aggregate, loading, error, dataBase, filters, pinned, togglePin, isPinned } =
    useContentHub()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const previewRef = useRef<HTMLDivElement | null>(null)
  const lastScrolledId = useRef<string | null>(null)
  const lastTrackedId = useRef<string | null>(null)
  const [cardsPage, setCardsPage] = useState(0)

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
  const isDesktopWide = useMediaQuery('(min-width: 1440px)')
  const isTablet = useMediaQuery('(min-width: 768px)')
  const isMobileWide = useMediaQuery('(min-width: 480px)')
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const mode = filters.mode

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

  const cardsPerPage = useMemo(() => {
    if (isDesktopWide) return 6
    if (isDesktop) return 4
    if (isTablet) return 3
    if (isMobileWide) return 2
    return 1
  }, [isDesktopWide, isDesktop, isTablet, isMobileWide])

  const cardsTotalPages = useMemo(() => {
    return Math.max(1, Math.ceil(ordered.length / cardsPerPage))
  }, [ordered.length, cardsPerPage])

  useEffect(() => {
    if (mode !== 'cards') return
    if (!selectedItem) return
    const idx = ordered.findIndex((entry) => entry.id === selectedItem.id)
    if (idx < 0) return
    const desiredPage = Math.floor(idx / cardsPerPage)
    setCardsPage((prev) => (prev === desiredPage ? prev : desiredPage))
  }, [cardsPerPage, mode, ordered, selectedItem])

  useEffect(() => {
    setCardsPage((prev) => {
      const maxPage = Math.max(0, cardsTotalPages - 1)
      return Math.min(Math.max(prev, 0), maxPage)
    })
  }, [cardsTotalPages])

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
      <div className='ax-content-inspect' data-columns='2' data-view='loading'>
        <div className='ax-content-column list'>
          <ContentList items={[]} selectedId={null} onSelect={noop} />
        </div>
        {isDesktop ? (
          <aside className='ax-panel-right' aria-label='Details panel'>
            <div
              className='ax-preview-panel ax-preview-panel--v2'
              ref={previewRef}
              role='region'
              aria-label='Content details'
            >
              <ContentDetailsPanel
                item={null}
                preview={null}
                dataBase={dataBase}
                variant={mode === 'inspect' ? 'inspect' : 'preview'}
              />
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

  const details = (
    <ContentDetailsPanel
      item={selectedItem}
      preview={previewEntry}
      dataBase={dataBase}
      onOpenSource={(id) => handleOpenSource(id)}
      variant={mode === 'inspect' ? 'inspect' : 'preview'}
    />
  )

  const listStage = (
    <ContentList
      items={ordered}
      selectedId={selectedItem?.id ?? null}
      onSelect={handleSelect}
      onTogglePin={handleTogglePin}
      isPinned={handleIsPinned}
    />
  )

  const cardsStart = cardsPage * cardsPerPage
  const visibleCards = useMemo(
    () => ordered.slice(cardsStart, cardsStart + cardsPerPage),
    [ordered, cardsStart, cardsPerPage],
  )

  const cardsStage = (
    <>
      {cardsTotalPages > 1 ? (
        <div className='ax-content-cards-nav' role='group' aria-label='Cards batch navigation'>
          <button
            type='button'
            className='ax-btn ghost'
            onClick={() => setCardsPage((prev) => Math.max(0, prev - 1))}
            disabled={cardsPage <= 0}
          >
            Prev batch
          </button>
          <span className='ax-content-cards-nav__stepper' aria-label={`Batch ${cardsPage + 1} of ${cardsTotalPages}`}>
            {cardsPage + 1}/{cardsTotalPages}
          </span>
          <button
            type='button'
            className='ax-btn ghost'
            onClick={() => setCardsPage((prev) => Math.min(cardsTotalPages - 1, prev + 1))}
            disabled={cardsPage >= cardsTotalPages - 1}
          >
            Next batch
          </button>
        </div>
      ) : null}
      <ContentCardsGrid
        items={visibleCards}
        selectedId={selectedItem?.id ?? null}
        onSelect={handleSelect}
        onTogglePin={handleTogglePin}
        isPinned={handleIsPinned}
      />
    </>
  )

  const orbitStage = (
    <OrbitView
      items={ordered}
      activeId={selectedItem?.id ?? null}
      onSelect={(id) => {
        const target = ordered.find((entry) => entry.id === id)
        if (target) handleSelect(target)
      }}
      reducedMotion={reducedMotion || !isDesktop}
      maxItems={24}
      onExit={() => filters.setMode('cards')}
    />
  )

  // Mobile / narrow layout: single stage, selection opens reader.
  if (!isDesktop) {
    return (
      <div className='ax-content-browse' data-mode={mode}>
        {mode === 'orbit' ? orbitStage : mode === 'cards' ? cardsStage : listStage}
      </div>
    )
  }

  if (mode === 'orbit') {
    return (
      <div className='ax-content-orbit' data-mode='orbit'>
        <div className='ax-content-orbit__actions' role='group' aria-label='Orbit actions'>
          <button type='button' className='ax-btn ghost' onClick={() => filters.setMode('cards')}>
            Back to Cards
          </button>
          <button type='button' className='ax-btn' onClick={() => filters.setMode('inspect')}>
            Open Inspect
          </button>
        </div>
        <div className='ax-content-stage' aria-label='Orbit stage'>
          {orbitStage}
        </div>
      </div>
    )
  }

  if (mode === 'inspect') {
    return (
      <div className='ax-content-inspect' data-columns='2' data-view='inspect'>
        <div className='ax-content-column list'>{listStage}</div>
        <aside className='ax-panel-right' aria-label='Details panel'>
          <div
            className='ax-preview-panel ax-preview-panel--v2'
            ref={previewRef}
            role='region'
            aria-label='Content details'
          >
            {details}
          </div>
        </aside>
      </div>
    )
  }

  return (
    <div className='ax-content-browse' data-mode={mode}>
      <div className='ax-content-stage' aria-label='Content stage'>
        {mode === 'cards' ? cardsStage : listStage}
      </div>
      <aside className='ax-panel-right' aria-label='Preview panel'>
        <div
          className='ax-preview-panel ax-preview-panel--v2'
          ref={previewRef}
          role='region'
          aria-label='Content preview'
        >
          <div className='ax-content-preview-actions' role='group' aria-label='Preview actions'>
            <button type='button' className='ax-btn ghost' onClick={() => filters.setMode('inspect')}>
              Open Inspect
            </button>
          </div>
          {details}
        </div>
      </aside>
    </div>
  )
}

export default ContentCategoryView
