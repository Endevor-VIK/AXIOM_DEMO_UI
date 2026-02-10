// AXIOM_DEMO_UI — WEB CORE
// Canvas: C19 — app/routes/dashboard/news/page.tsx
// Purpose: News panel with Red Protocol filters, grid layout and pagination.

import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import CounterWreath from '@/components/counters/CounterWreath'
import { vfs, type NewsItem, type NewsKind } from '@/lib/vfs'
import NewsCard from '@/components/NewsCard'
import '@/styles/news-signal-center.css'

const KIND_FILTERS: ('' | NewsKind)[] = ['', 'update', 'release', 'heads-up', 'roadmap']
const PAGE_SIZES = [4, 8, 12]
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
] as const

type SortOrder = (typeof SORT_OPTIONS)[number]['value']

const KIND_VARIANT: Record<string, 'info' | 'good' | 'warn'> = {
  release: 'good',
  update: 'info',
  'heads-up': 'warn',
  roadmap: 'info',
}

function resolveKindVariant(kind?: string): 'info' | 'good' | 'warn' {
  if (!kind) return 'info'
  const key = kind.toLowerCase()
  return KIND_VARIANT[key] || 'info'
}

function compareDatesDesc(a: NewsItem, b: NewsItem) {
  return a.date < b.date ? 1 : a.date > b.date ? -1 : 0
}

function compareDatesAsc(a: NewsItem, b: NewsItem) {
  return a.date < b.date ? -1 : a.date > b.date ? 1 : 0
}

function matchesQuery(item: NewsItem, term: string) {
  if (!term) return true
  const haystack = [item.title, item.summary, ...(item.tags ?? [])]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return haystack.includes(term)
}

function resolvePacketVersion(item: NewsItem | null) {
  if (!item?.tags?.length) return '-'
  const versionTag = item.tags.find((tag) => /v\d+/i.test(tag) || /version/i.test(tag))
  return versionTag ? versionTag.toUpperCase() : '-'
}

function resolvePacketSource(item: NewsItem | null) {
  if (!item) return '-'
  if (item.file) {
    const parts = item.file.split('/')
    return parts[parts.length - 1] || item.file
  }
  if (item.link) {
    try {
      const url = new URL(item.link, 'http://localhost')
      return url.hostname !== 'localhost' ? url.hostname : (url.pathname.replace('/', '') || item.link)
    } catch {
      return item.link
    }
  }
  return 'manifest'
}

type NewsDispatchPillarProps = {
  busy: boolean
  total: number
  visible: number
  page: number
  pageCount: number
}

function NewsDispatchPillar({ busy, total, visible, page, pageCount }: NewsDispatchPillarProps) {
  const state = busy ? 'loading' : total === 0 ? 'empty' : 'ready'
  const displayPage = pageCount > 0 ? page : 0
  const displayPageCount = pageCount > 0 ? pageCount : 0

  return (
    <aside className='ax-card ax-news-pillar' data-state={state} aria-label='News dispatch telemetry'>
      <header className='ax-news-pillar__header'>
        <div>
          <span className='ax-news-pillar__eyebrow'>NEWS DISPATCH</span>
          <h2 className='ax-news-pillar__title'>CONTROL STATUS</h2>
        </div>
        <span className='ax-news-pillar__status' aria-hidden>
          LIVE
        </span>
      </header>

      <div className='ax-hr-blade' aria-hidden />

      <div className='ax-news-pillar__ring'>
        <CounterWreath value={total} label='TOTAL NEWS' size={190} ariaLabel={`Total news ${total}`} />
        <span className='ax-news-pillar__ring-label'>TOTAL NEWS</span>
      </div>

      <div className='ax-news-pillar__telemetry'>
        <div className='ax-news-telemetry'>
          <span>VISIBLE</span>
          <strong>{visible}</strong>
        </div>
        <div className='ax-news-telemetry'>
          <span>TOTAL</span>
          <strong>{total}</strong>
        </div>
        <div className='ax-news-telemetry'>
          <span>PAGE</span>
          <strong>{displayPage} / {displayPageCount}</strong>
        </div>
      </div>

      <div className='ax-news-pillar__links' aria-label='Quick routes'>
        <Link className='ax-btn ghost' to='/dashboard/roadmap'>
          ROADMAP
        </Link>
        <Link className='ax-btn ghost' to='/dashboard/content'>
          CONTENT
        </Link>
      </div>
    </aside>
  )
}

type SignalCenterHeroProps = {
  busy: boolean
  item: NewsItem | null
}

function SignalCenterHero({ busy, item }: SignalCenterHeroProps) {
  const state = busy ? 'loading' : item ? 'ready' : 'empty'
  const variant = resolveKindVariant(item?.kind)
  const kindLabel = (item?.kind || 'news').toUpperCase()
  const tagCount = item?.tags?.length ?? 0
  const versionLabel = resolvePacketVersion(item)
  const sourceLabel = resolvePacketSource(item)
  const linkHref = item?.link ?? ''
  const [copied, setCopied] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    if (!copied) return undefined
    const timer = window.setTimeout(() => setCopied(false), 1600)
    return () => window.clearTimeout(timer)
  }, [copied])

  useEffect(() => {
    if (!modalOpen) return undefined
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setModalOpen(false)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [modalOpen])

  const handleCopy = async () => {
    if (!linkHref || !navigator?.clipboard) return
    try {
      await navigator.clipboard.writeText(linkHref)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <section className='ax-card ax-signal-hero' data-state={state} aria-label='Signal Center last packet'>
      <header className='ax-signal-hero__header'>
        <div className='ax-signal-hero__label'>
          <span className='ax-signal-hero__eyebrow'>SIGNAL CENTER</span>
          <h2 className='ax-signal-hero__title'>LAST PACKET</h2>
          <span className='ax-signal-hero__subtitle'>FRESH DISPATCH</span>
        </div>
        <div className='ax-signal-hero__status-strip'>
          <span className='ax-chip' data-variant={variant}>{kindLabel}</span>
          <span className='ax-signal-hero__date'>{item?.date ?? '-'}</span>
        </div>
      </header>

      {busy ? (
        <div className='ax-signal-hero__skeleton' aria-hidden>
          <span className='ax-signal-hero__bar' />
          <span className='ax-signal-hero__bar is-wide' />
          <span className='ax-signal-hero__bar is-mid' />
        </div>
      ) : item ? (
        <div className='ax-signal-hero__body'>
          <div className='ax-signal-hero__main'>
            <div className='ax-signal-hero__content'>
              <h3 className='ax-signal-hero__headline'>{item.title}</h3>
              {item.summary ? <p className='ax-signal-hero__summary'>{item.summary}</p> : null}
            </div>

            <div className='ax-signal-hero__tags-row'>
              {item.tags?.length ? (
                <div className='ax-signal-hero__tags' aria-label='tags'>
                  {item.tags.map((tag) => (
                    <span key={tag} className='ax-chip' data-variant='info'>
                      {tag.toUpperCase()}
                    </span>
                  ))}
                </div>
              ) : (
                <span className='ax-signal-hero__tags-empty'>NO TAGS</span>
              )}
            </div>

            <div className='ax-signal-hero__cta'>
              {linkHref ? (
                <a className='ax-btn primary ax-signal-hero__cta-primary' href={linkHref} target='_blank' rel='noopener noreferrer'>
                  OPEN PACKET
                </a>
              ) : (
                <span className='ax-chip' data-variant='warn'>COMING SOON</span>
              )}
              <a className='ax-btn ghost' href='#news-grid'>VIEW ALL</a>
            </div>
          </div>

          <aside className='ax-signal-hero__side'>
            <div className='ax-signal-hero__panel'>
              <span className='ax-signal-hero__panel-title'>PACK META</span>
              <div className='ax-signal-hero__meta-grid'>
                <div className='ax-signal-hero__meta-item'>
                  <span className='ax-signal-hero__meta-label'>DATE</span>
                  <span className='ax-signal-hero__meta-value'>{item.date}</span>
                </div>
                <div className='ax-signal-hero__meta-item'>
                  <span className='ax-signal-hero__meta-label'>TYPE</span>
                  <span className='ax-signal-hero__meta-value'>{kindLabel}</span>
                </div>
                <div className='ax-signal-hero__meta-item'>
                  <span className='ax-signal-hero__meta-label'>VERSION</span>
                  <span className='ax-signal-hero__meta-value'>{versionLabel}</span>
                </div>
                <div className='ax-signal-hero__meta-item'>
                  <span className='ax-signal-hero__meta-label'>SOURCE</span>
                  <span className='ax-signal-hero__meta-value'>{sourceLabel}</span>
                </div>
                <div className='ax-signal-hero__meta-item'>
                  <span className='ax-signal-hero__meta-label'>TAGS</span>
                  <span className='ax-signal-hero__meta-value'>{tagCount}</span>
                </div>
              </div>
            </div>

            <div className='ax-signal-hero__panel'>
              <span className='ax-signal-hero__panel-title'>QUICK LINKS</span>
              <div className='ax-signal-hero__quick-links'>
                <button type='button' className='ax-btn ghost' onClick={() => linkHref && window.open(linkHref, '_blank', 'noopener,noreferrer')} disabled={!linkHref}>
                  OPEN
                </button>
                <button type='button' className='ax-btn ghost' onClick={handleCopy} disabled={!linkHref}>
                  {copied ? 'COPIED' : 'COPY LINK'}
                </button>
                <button type='button' className='ax-btn ghost' onClick={() => setModalOpen(true)} disabled={!item}>
                  OPEN MODAL
                </button>
              </div>
            </div>
          </aside>
        </div>
      ) : (
        <div className='ax-signal-hero__empty'>
          <h3 className='ax-signal-hero__headline'>NO DISPATCHES</h3>
          <p className='ax-signal-hero__summary'>News manifest is empty. Add items to populate the feed.</p>
        </div>
      )}

      {modalOpen && item ? (
        <div className='ax-modal' role='dialog' aria-modal='true' aria-label='News packet preview'>
          <button type='button' className='ax-modal__backdrop' onClick={() => setModalOpen(false)} aria-label='Close modal' />
          <div className='ax-modal__panel ax-signal-modal'>
            <header className='ax-signal-modal__header'>
              <div>
                <span className='ax-signal-modal__eyebrow'>SIGNAL CENTER</span>
                <h3 className='ax-signal-modal__title'>{item.title}</h3>
              </div>
              <button type='button' className='ax-btn ghost' onClick={() => setModalOpen(false)}>CLOSE</button>
            </header>
            <div className='ax-signal-modal__meta'>
              <span className='ax-chip' data-variant={variant}>{kindLabel}</span>
              <span className='ax-signal-modal__date'>{item.date}</span>
            </div>
            {item.summary ? <p className='ax-signal-modal__summary'>{item.summary}</p> : null}
            {item.tags?.length ? (
              <div className='ax-signal-modal__tags'>
                {item.tags.map((tag) => (
                  <span key={tag} className='ax-chip' data-variant='info'>{tag.toUpperCase()}</span>
                ))}
              </div>
            ) : null}
            <div className='ax-signal-modal__actions'>
              {linkHref ? (
                <a className='ax-btn primary' href={linkHref} target='_blank' rel='noopener noreferrer'>OPEN PACKET</a>
              ) : (
                <span className='ax-chip' data-variant='warn'>COMING SOON</span>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}

type NewsFilterBarProps = {
  busy: boolean
  q: string
  kind: '' | NewsKind
  sort: SortOrder
  pageSize: number
  total: number
  visible: number
  page: number
  pageCount: number
  onQueryChange: (value: string) => void
  onKindChange: (value: '' | NewsKind) => void
  onSortChange: (value: SortOrder) => void
  onPageSizeChange: (value: number) => void
  onPrev: () => void
  onNext: () => void
}

function NewsFilterBar({
  busy,
  q,
  kind,
  sort,
  pageSize,
  total,
  visible,
  page,
  pageCount,
  onQueryChange,
  onKindChange,
  onSortChange,
  onPageSizeChange,
  onPrev,
  onNext,
}: NewsFilterBarProps) {
  const displayPage = pageCount > 0 ? page : 0
  const displayPageCount = pageCount > 0 ? pageCount : 0
  const canGoPrev = displayPage > 1
  const canGoNext = displayPageCount > 0 && displayPage < displayPageCount

  return (
    <section className='ax-card ax-news-bar' data-state={busy ? 'loading' : 'ready'} aria-label='News filters'>
      <div className='ax-news-bar__rail'>
        <div className='ax-news-bar__left'>
          <label className='visually-hidden' htmlFor='news-search'>Search news</label>
          <input
            id='news-search'
            className='ax-input'
            type='search'
            placeholder='Search title, summary, tags'
            value={q}
            onChange={(event) => onQueryChange(event.target.value)}
            disabled={busy}
          />

          <label className='visually-hidden' htmlFor='news-kind'>Filter by kind</label>
          <select
            id='news-kind'
            className='ax-input'
            value={kind}
            onChange={(event) => onKindChange(event.target.value as '' | NewsKind)}
            disabled={busy}
          >
            <option value=''>All kinds</option>
            {KIND_FILTERS.filter(Boolean).map((value) => (
              <option key={value} value={value}>
                {value?.toUpperCase()}
              </option>
            ))}
          </select>

          <label className='visually-hidden' htmlFor='news-sort'>Sort news</label>
          <select
            id='news-sort'
            className='ax-input'
            value={sort}
            onChange={(event) => onSortChange(event.target.value as SortOrder)}
            disabled={busy}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <label className='visually-hidden' htmlFor='news-size'>Items per page</label>
          <select
            id='news-size'
            className='ax-input ax-news-bar__size'
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            disabled={busy}
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size} / page
              </option>
            ))}
          </select>
        </div>

        <div className='ax-news-bar__right'>
          <div className='ax-news-bar__meta'>
            <span className='ax-chip ax-news-bar__pill' data-variant='info'>TOTAL :: {total}</span>
            <span className='ax-chip ax-news-bar__pill' data-variant='info'>VISIBLE :: {visible}</span>
            <span className='ax-chip ax-news-bar__pill' data-variant='level'>PAGE :: {displayPage} / {displayPageCount}</span>
          </div>
          <div className='ax-news-bar__nav'>
            <button type='button' className='ax-btn ghost ax-news-bar__btn' onClick={onPrev} disabled={!canGoPrev}>
              <span className='ax-news-bar__arrow' aria-hidden='true'>&larr;</span>
              Prev
            </button>
            <button type='button' className='ax-btn ghost ax-news-bar__btn' onClick={onNext} disabled={!canGoNext}>
              Next
              <span className='ax-news-bar__arrow' aria-hidden='true'>&rarr;</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

export default function NewsPage() {
  const [items, setItems] = useState<NewsItem[]>([])
  const [q, setQ] = useState('')
  const [kind, setKind] = useState<'' | NewsKind>('')
  const [sort, setSort] = useState<SortOrder>('newest')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(8)
  const [busy, setBusy] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        setBusy(true)
        const list = await vfs.readNewsManifest()
        if (!alive) return
        setItems(list)
        setErr(null)
      } catch (e: any) {
        if (!alive) return
        setErr(e?.message || 'Unable to load news manifest')
      } finally {
        if (alive) setBusy(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    setPage(1)
  }, [q, kind, pageSize, sort])

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    return items.filter((item) => matchesQuery(item, term) && (!kind || item.kind === kind))
  }, [items, q, kind])

  const newestFirst = useMemo(() => {
    const list = [...filtered]
    list.sort(compareDatesDesc)
    return list
  }, [filtered])

  const sortedItems = useMemo(() => {
    if (sort === 'newest') return newestFirst
    return [...newestFirst].sort(compareDatesAsc)
  }, [newestFirst, sort])

  const featuredItem = newestFirst[0] ?? null
  const totalPages = Math.max(1, Math.ceil(sortedItems.length / pageSize))

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  const pageItems = sortedItems.slice((page - 1) * pageSize, page * pageSize)
  const newsTotal = items.length
  const visibleTotal = filtered.length

  const handlePrev = () => setPage((prev) => Math.max(1, prev - 1))
  const handleNext = () => setPage((prev) => Math.min(totalPages, prev + 1))

  return (
    <section className='ax-container ax-section ax-news-signal' aria-busy={busy}>
      <div className='ax-news-signal__stack'>
        <div className='ax-news-signal__hero-row'>
          <NewsDispatchPillar
            busy={busy}
            total={newsTotal}
            visible={visibleTotal}
            page={page}
            pageCount={sortedItems.length ? totalPages : 0}
          />
          <SignalCenterHero busy={busy} item={featuredItem} />
        </div>

        <NewsFilterBar
          busy={busy}
          q={q}
          kind={kind}
          sort={sort}
          pageSize={pageSize}
          total={newsTotal}
          visible={visibleTotal}
          page={page}
          pageCount={sortedItems.length ? totalPages : 0}
          onQueryChange={setQ}
          onKindChange={setKind}
          onSortChange={setSort}
          onPageSizeChange={setPageSize}
          onPrev={handlePrev}
          onNext={handleNext}
        />

        {err && <div className='ax-dashboard__alert' role='alert'>{err}</div>}

        <div className='ax-news-grid' id='news-grid'>
          {busy && items.length === 0 ? (
            Array.from({ length: Math.min(pageSize, 4) }).map((_, index) => (
              <article key={`skeleton-${index}`} className='ax-card ax-news-card is-skeleton' aria-hidden='true'>
                <div className='ax-news-card__skeleton-head'>
                  <span className='ax-news-card__skeleton-line is-wide' />
                  <span className='ax-news-card__skeleton-line is-mid' />
                </div>
                <div className='ax-news-card__skeleton-meta'>
                  <span className='ax-news-card__skeleton-pill' />
                  <span className='ax-news-card__skeleton-pill' />
                </div>
                <div className='ax-news-card__skeleton-body'>
                  <span className='ax-news-card__skeleton-line' />
                  <span className='ax-news-card__skeleton-line is-wide' />
                </div>
              </article>
            ))
          ) : pageItems.length === 0 ? (
            <div className='ax-card ax-news-empty'>
              <h3 className='ax-blade-head'>No items found</h3>
              <p className='ax-news-card__summary'>Adjust filters or add new content in the NEWS module.</p>
            </div>
          ) : (
            pageItems.map((item) => <NewsCard key={item.id} item={item} />)
          )}
        </div>
      </div>
    </section>
  )
}
