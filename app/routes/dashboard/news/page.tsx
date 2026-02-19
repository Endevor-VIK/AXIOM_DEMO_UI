// AXIOM_DEMO_UI — WEB CORE
// Canvas: C19 — app/routes/dashboard/news/page.tsx
// Purpose: NEWS v2 master-detail feed with Dispatch + Signal Center preserved.

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

import CounterWreath from '@/components/counters/CounterWreath'
import { countNewSince, newsV2Keys, readIdSet, readTimestamp, writeIdSet, writeTimestamp } from '@/lib/news/v2State'
import { useSession } from '@/lib/identity/useSession'
import { vfs, type NewsItem, type NewsKind } from '@/lib/vfs'

import '@/styles/news-signal-center.css'

const KIND_FILTERS: ('' | NewsKind)[] = ['', 'update', 'release', 'heads-up', 'roadmap']
const PAGE_SIZES = [12, 20, 50]
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
] as const

type SortOrder = (typeof SORT_OPTIONS)[number]['value']

type SignalTab = 'summary' | 'meta' | 'links'

const DEFAULT_AUTOPLAY_INTERVAL_SEC = 12

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

function normalizePath(path: string) {
  return path.replace(/\/+$/, '') || '/'
}

function resolveActionLink(link: string | undefined, currentPath: string) {
  if (!link) return null
  if (link.startsWith('http://') || link.startsWith('https://')) return link
  const normalizedCurrent = normalizePath(currentPath)
  const cleanLink = normalizePath(link.split('?')[0] ?? '')
  if (cleanLink === normalizedCurrent) return null
  return link
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

type NewsDispatchPanelProps = {
  busy: boolean
  pinnedOnly: boolean
  unreadOnly: boolean
  onTogglePinnedOnly: () => void
  onToggleUnreadOnly: () => void
  onMarkAllRead: () => void
  total: number
  visible: number
  unread: number
  fresh: number
  pinned: number
  page: number
  pageCount: number
}

function NewsDispatchPanel({
  busy,
  pinnedOnly,
  unreadOnly,
  onTogglePinnedOnly,
  onToggleUnreadOnly,
  onMarkAllRead,
  total,
  visible,
  unread,
  fresh,
  pinned,
  page,
  pageCount,
}: NewsDispatchPanelProps) {
  const state = busy ? 'loading' : total === 0 ? 'empty' : 'ready'
  const displayPage = pageCount > 0 ? page : 0
  const displayPageCount = pageCount > 0 ? pageCount : 0

  return (
    <aside className='ax-card ax-news-pillar' data-state={state} aria-label='News dispatch'>
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
        <CounterWreath value={total} label='TOTAL NEWS' size={180} ariaLabel={`Total news ${total}`} />
        <span className='ax-news-pillar__ring-label'>TOTAL NEWS</span>
      </div>

      <div className='ax-news-pillar__telemetry'>
        <div className='ax-news-telemetry'>
          <span>UNREAD</span>
          <strong>{unread}</strong>
        </div>
        <div className='ax-news-telemetry'>
          <span>NEW</span>
          <strong>{fresh}</strong>
        </div>
        <div className='ax-news-telemetry'>
          <span>VISIBLE</span>
          <strong>{visible}</strong>
        </div>
        <div className='ax-news-telemetry'>
          <span>PAGE</span>
          <strong>
            {displayPage} / {displayPageCount}
          </strong>
        </div>
      <div className='ax-news-telemetry'>
          <span>PINNED</span>
          <strong>{pinned}</strong>
        </div>
      </div>

      <div className='ax-news-pillar__actions' aria-label='Dispatch actions'>
        <button
          type='button'
          className='ax-btn ghost ax-news-pillar__action'
          onClick={onMarkAllRead}
          disabled={busy || visible === 0}
        >
          MARK ALL READ
        </button>
        <button
          type='button'
          className='ax-btn ghost ax-news-pillar__action'
          onClick={onToggleUnreadOnly}
          disabled={busy}
          data-active={unreadOnly ? 'true' : undefined}
        >
          UNREAD ONLY
        </button>
        <button
          type='button'
          className='ax-btn ghost ax-news-pillar__action'
          onClick={onTogglePinnedOnly}
          disabled={busy}
          data-active={pinnedOnly ? 'true' : undefined}
        >
          PINNED ONLY
        </button>
      </div>

      <div className='ax-news-pillar__links' aria-label='Quick routes'>
        <Link className='ax-btn ghost' to='/dashboard/chronicle'>
          CHRONICLE
        </Link>
        <Link className='ax-btn ghost' to='/dashboard/content'>
          CONTENT
        </Link>
      </div>
    </aside>
  )
}

type SignalCenterProps = {
  busy: boolean
  mode: 'selected' | 'pinned' | 'latest'
  item: NewsItem | null
  tab: SignalTab
  pinned: boolean
  read: boolean
  autoplayIntervalSec: number
  manualSelectionSeq: number
  resolvedLink: string | null
  canPrev: boolean
  canNext: boolean
  onPrev: () => void
  onNext: () => void
  onSelectTab: (value: SignalTab) => void
  onTogglePinned: () => void
  onToggleRead: () => void
}

function SignalCenter({
  busy,
  mode,
  item,
  tab,
  pinned,
  read,
  autoplayIntervalSec,
  manualSelectionSeq,
  resolvedLink,
  canPrev,
  canNext,
  onPrev,
  onNext,
  onSelectTab,
  onTogglePinned,
  onToggleRead,
}: SignalCenterProps) {
  const state = busy ? 'loading' : item ? 'ready' : 'empty'
  const variant = resolveKindVariant(item?.kind)
  const kindLabel = (item?.kind || 'news').toUpperCase()
  const modeLabel = mode.toUpperCase()
  const versionLabel = resolvePacketVersion(item)
  const sourceLabel = resolvePacketSource(item)
  const tagCount = item?.tags?.length ?? 0

  const autoplaySupported = autoplayIntervalSec > 0
  const [copied, setCopied] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [autoplayEnabled, setAutoplayEnabled] = useState(autoplaySupported)
  const [autoplayProgress, setAutoplayProgress] = useState(0)
  const [hovering, setHovering] = useState(false)
  const [focusWithin, setFocusWithin] = useState(false)
  const [interactionPause, setInteractionPause] = useState(false)

  const interactionTimeoutRef = useRef<number | null>(null)
  const tickTimerRef = useRef<number | null>(null)
  const nextAtRef = useRef<number | null>(null)
  const remainingMsRef = useRef<number | null>(null)
  const lastManualSelectionSeqRef = useRef<number>(manualSelectionSeq)

  const intervalMs = autoplayIntervalSec * 1000

  const clearTickTimer = () => {
    if (tickTimerRef.current == null) return
    window.clearInterval(tickTimerRef.current)
    tickTimerRef.current = null
  }

  const triggerInteractionPause = (ms = 1500) => {
    if (interactionTimeoutRef.current != null) {
      window.clearTimeout(interactionTimeoutRef.current)
    }
    setInteractionPause(true)
    remainingMsRef.current = intervalMs
    nextAtRef.current = null
    setAutoplayProgress(0)
    interactionTimeoutRef.current = window.setTimeout(() => {
      setInteractionPause(false)
    }, ms)
  }

  useEffect(() => {
    return () => {
      clearTickTimer()
      if (interactionTimeoutRef.current != null) {
        window.clearTimeout(interactionTimeoutRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const autoplayPauseReason = useMemo(() => {
    if (!autoplayEnabled) return null
    if (busy) return 'busy'
    if (!item) return 'empty'
    if (!canNext) return 'end'
    if (modalOpen) return 'modal'
    if (hovering) return 'hover'
    if (focusWithin) return 'focus'
    if (interactionPause) return 'interaction'
    return null
  }, [autoplayEnabled, busy, canNext, focusWithin, hovering, interactionPause, item, modalOpen])

  useEffect(() => {
    if (!autoplayEnabled) {
      lastManualSelectionSeqRef.current = manualSelectionSeq
      return
    }
    if (manualSelectionSeq === lastManualSelectionSeqRef.current) return
    lastManualSelectionSeqRef.current = manualSelectionSeq
    triggerInteractionPause(1500)
  }, [manualSelectionSeq, autoplayEnabled])

  useEffect(() => {
    if (!autoplayEnabled) return
    remainingMsRef.current = intervalMs
    nextAtRef.current = null
    setAutoplayProgress(0)
  }, [autoplayEnabled, intervalMs, item?.id])

  useEffect(() => {
    clearTickTimer()
    if (!autoplayEnabled) {
      nextAtRef.current = null
      remainingMsRef.current = null
      setAutoplayProgress(0)
      return
    }

    if (busy || !item) {
      nextAtRef.current = null
      setAutoplayProgress(0)
      return
    }

    if (!canNext) {
      setAutoplayEnabled(false)
      nextAtRef.current = null
      remainingMsRef.current = null
      setAutoplayProgress(0)
      return
    }

    if (autoplayPauseReason) {
      if (nextAtRef.current != null) {
        remainingMsRef.current = Math.max(0, nextAtRef.current - Date.now())
      }
      nextAtRef.current = null
      return
    }

    if (nextAtRef.current == null) {
      const remaining = remainingMsRef.current ?? intervalMs
      nextAtRef.current = Date.now() + remaining
      remainingMsRef.current = null
    }

    const tick = () => {
      if (nextAtRef.current == null) return
      const now = Date.now()
      const remaining = nextAtRef.current - now
      const nextProgress = 1 - remaining / intervalMs
      setAutoplayProgress(Math.max(0, Math.min(1, nextProgress)))

      if (remaining > 0) return

      setAutoplayProgress(0)
      if (!canNext) {
        setAutoplayEnabled(false)
        return
      }
      onNext()
      nextAtRef.current = Date.now() + intervalMs
    }

    tick()
    tickTimerRef.current = window.setInterval(tick, 50)

    return () => clearTickTimer()
  }, [autoplayEnabled, autoplayPauseReason, busy, canNext, intervalMs, item, onNext])

  useEffect(() => {
    if (!copied) return undefined
    const timer = window.setTimeout(() => setCopied(false), 1600)
    return () => window.clearTimeout(timer)
  }, [copied])

  useEffect(() => {
    if (!modalOpen) return undefined
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setModalOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [modalOpen])

  const handleCopy = async () => {
    if (!resolvedLink || !navigator?.clipboard) return
    try {
      await navigator.clipboard.writeText(resolvedLink)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  const linkAvailable = Boolean(resolvedLink)

  return (
    <section
      className='ax-card ax-signal-hero ax-signal-center'
      data-state={state}
      data-autoplay={autoplayEnabled ? 'true' : undefined}
      data-autoplay-paused={autoplayPauseReason ? 'true' : undefined}
      aria-label='Signal Center'
      data-testid='signal-center'
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onFocusCapture={() => setFocusWithin(true)}
      onBlurCapture={(event) => {
        const next = event.relatedTarget as Node | null
        if (next && event.currentTarget.contains(next)) return
        setFocusWithin(false)
      }}
      onWheel={() => {
        if (!autoplayEnabled) return
        triggerInteractionPause(1500)
      }}
      onTouchStart={() => {
        if (!autoplayEnabled) return
        triggerInteractionPause(1500)
      }}
    >
      <header className='ax-signal-hero__header ax-signal-center__header'>
        <div className='ax-signal-hero__label'>
          <span className='ax-signal-hero__eyebrow'>SIGNAL CENTER</span>
          <h2 className='ax-signal-hero__title'>PACKET READER</h2>
          <span className='ax-signal-hero__subtitle'>MODE :: {modeLabel}</span>
        </div>

        <div className='ax-signal-center__status'>
          <div className='ax-signal-hero__status-strip'>
            <span className='ax-chip' data-variant={variant}>
              {kindLabel}
            </span>
            <span className='ax-signal-hero__date'>{item?.date ?? '-'}</span>
          </div>

          <div className='ax-signal-center__actions' aria-label='Signal actions'>
            <button
              type='button'
              className='ax-btn ghost'
              onClick={() => {
                if (autoplayEnabled) triggerInteractionPause(1500)
                onPrev()
              }}
              disabled={!canPrev || busy}
            >
              Prev
            </button>
            <button
              type='button'
              className='ax-btn ghost'
              onClick={() => {
                if (autoplayEnabled) triggerInteractionPause(1500)
                onNext()
              }}
              disabled={!canNext || busy}
            >
              Next
            </button>

            {autoplayEnabled ? (
              <div
                className='ax-autoplay-meter'
                aria-hidden='true'
                title={autoplayPauseReason ? `PAUSED :: ${autoplayPauseReason.toUpperCase()}` : `AUTOPLAY :: ${autoplayIntervalSec}s`}
              >
                <span className='ax-autoplay-meter__fill' style={{ transform: `scaleX(${autoplayProgress})` }} />
              </div>
            ) : null}

            <button
              type='button'
              className='ax-btn ghost'
              onClick={() => {
                setAutoplayEnabled((v) => !v)
              }}
              data-active={autoplayEnabled ? 'true' : undefined}
              disabled={!autoplaySupported || busy || !item || (!canNext && !autoplayEnabled)}
            >
              AUTO
            </button>
          </div>
        </div>
      </header>

      <div className='ax-signal-center__tabs' role='tablist' aria-label='Signal tabs'>
        {(
          [
            { id: 'summary' as const, label: 'SUMMARY' },
            { id: 'meta' as const, label: 'META' },
            { id: 'links' as const, label: 'LINKS' },
          ] as const
        ).map((entry) => (
          <button
            key={entry.id}
            type='button'
            role='tab'
            className='ax-btn ghost ax-signal-center__tab'
            aria-selected={tab === entry.id}
            data-active={tab === entry.id ? 'true' : undefined}
            onClick={() => onSelectTab(entry.id)}
            disabled={busy}
          >
            {entry.label}
          </button>
        ))}
      </div>

      <div className='ax-signal-center__body' data-tab={tab}>
        {busy ? (
          <div className='ax-signal-hero__skeleton' aria-hidden>
            <span className='ax-signal-hero__bar' />
            <span className='ax-signal-hero__bar is-wide' />
            <span className='ax-signal-hero__bar is-mid' />
          </div>
        ) : item ? (
          <>
            {tab === 'summary' ? (
              <div key={item.id} className='ax-signal-center__panel ax-signal-center__packet'>
                <h3 className='ax-signal-hero__headline'>{item.title}</h3>
                {item.summary ? <p className='ax-signal-center__summary'>{item.summary}</p> : null}
                {item.tags?.length ? (
                  <div className='ax-signal-center__tags' aria-label='tags'>
                    {item.tags.slice(0, 8).map((tag) => (
                      <span key={tag} className='ax-chip' data-variant='info'>
                        {tag.toUpperCase()}
                      </span>
                    ))}
                    {item.tags.length > 8 ? (
                      <span className='ax-chip' data-variant='level'>
                        +{item.tags.length - 8}
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}

            {tab === 'meta' ? (
              <div key={item.id} className='ax-signal-hero__panel ax-signal-center__panel ax-signal-center__packet'>
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
            ) : null}

            {tab === 'links' ? (
              <div key={item.id} className='ax-signal-hero__panel ax-signal-center__panel ax-signal-center__packet'>
                <span className='ax-signal-hero__panel-title'>QUICK LINKS</span>
                <div className='ax-signal-hero__quick-links'>
                  {linkAvailable ? (
                    <a className='ax-btn primary' href={resolvedLink as string} target='_blank' rel='noopener noreferrer'>
                      OPEN
                    </a>
                  ) : (
                    <span className='ax-chip' data-variant='warn'>
                      COMING SOON
                    </span>
                  )}

                  <button type='button' className='ax-btn ghost' onClick={handleCopy} disabled={!linkAvailable}>
                    {copied ? 'COPIED' : 'COPY LINK'}
                  </button>

                  <button type='button' className='ax-btn ghost' onClick={() => setModalOpen(true)}>
                    OPEN MODAL
                  </button>

                  <button type='button' className='ax-btn ghost' onClick={onTogglePinned} disabled={busy}>
                    {pinned ? 'UNPIN' : 'PIN'}
                  </button>
                  <button type='button' className='ax-btn ghost' onClick={onToggleRead} disabled={busy}>
                    {read ? 'MARK UNREAD' : 'MARK READ'}
                  </button>
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <div className='ax-signal-hero__empty'>
            <h3 className='ax-signal-hero__headline'>NO DISPATCHES</h3>
            <p className='ax-signal-hero__summary'>News manifest is empty. Add items to populate the feed.</p>
          </div>
        )}
      </div>

      {modalOpen && item ? (
        <div className='ax-modal' role='dialog' aria-modal='true' aria-label='News packet preview'>
          <button type='button' className='ax-modal__backdrop' onClick={() => setModalOpen(false)} aria-label='Close modal' />
          <div className='ax-modal__panel ax-signal-modal'>
            <header className='ax-signal-modal__header'>
              <div>
                <span className='ax-signal-modal__eyebrow'>SIGNAL CENTER</span>
                <h3 className='ax-signal-modal__title'>{item.title}</h3>
              </div>
              <button type='button' className='ax-btn ghost' onClick={() => setModalOpen(false)}>
                CLOSE
              </button>
            </header>
            <div className='ax-signal-modal__meta'>
              <span className='ax-chip' data-variant={variant}>
                {kindLabel}
              </span>
              <span className='ax-signal-modal__date'>{item.date}</span>
            </div>
            {item.summary ? <p className='ax-signal-modal__summary'>{item.summary}</p> : null}
            {item.tags?.length ? (
              <div className='ax-signal-modal__tags'>
                {item.tags.map((tag) => (
                  <span key={tag} className='ax-chip' data-variant='info'>
                    {tag.toUpperCase()}
                  </span>
                ))}
              </div>
            ) : null}
            <div className='ax-signal-modal__actions'>
              {resolvedLink ? (
                <a className='ax-btn primary' href={resolvedLink} target='_blank' rel='noopener noreferrer'>
                  OPEN
                </a>
              ) : (
                <span className='ax-chip' data-variant='warn'>
                  COMING SOON
                </span>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}

type NewsToolbarProps = {
  busy: boolean
  q: string
  kind: '' | NewsKind
  sort: SortOrder
  pageSize: number
  page: number
  pageCount: number
  onQueryChange: (value: string) => void
  onKindChange: (value: '' | NewsKind) => void
  onSortChange: (value: SortOrder) => void
  onPageSizeChange: (value: number) => void
  onPrevPage: () => void
  onNextPage: () => void
}

function NewsToolbar({
  busy,
  q,
  kind,
  sort,
  pageSize,
  page,
  pageCount,
  onQueryChange,
  onKindChange,
  onSortChange,
  onPageSizeChange,
  onPrevPage,
  onNextPage,
}: NewsToolbarProps) {
  const displayPage = pageCount > 0 ? page : 0
  const displayPageCount = pageCount > 0 ? pageCount : 0
  const canGoPrev = displayPage > 1
  const canGoNext = displayPageCount > 0 && displayPage < displayPageCount

  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <section className='ax-card ax-news-bar' data-state={busy ? 'loading' : 'ready'} aria-label='News toolbar'>
      <div className='ax-news-bar__rail'>
        <div className='ax-news-bar__left'>
          <label className='visually-hidden' htmlFor='news-search'>
            Search news
          </label>
          <div className='ax-news-bar__search'>
            <span className='ax-news-bar__icon' aria-hidden='true'>
              ⌕
            </span>
            <input
              id='news-search'
              className='ax-input'
              type='search'
              placeholder='Search title, summary, tags'
              value={q}
              onChange={(event) => onQueryChange(event.target.value)}
              disabled={busy}
            />
            {q ? (
              <button type='button' className='ax-news-bar__clear' onClick={() => onQueryChange('')} aria-label='Clear search'>
                ×
              </button>
            ) : null}
          </div>

          <label className='visually-hidden' htmlFor='news-kind'>
            Filter by kind
          </label>
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

          <label className='visually-hidden' htmlFor='news-sort'>
            Sort news
          </label>
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

          <label className='visually-hidden' htmlFor='news-size'>
            Items per page
          </label>
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

          <button type='button' className='ax-btn ghost ax-news-bar__btn' onClick={() => setDrawerOpen((v) => !v)}>
            Filters…
          </button>
        </div>

        <div className='ax-news-bar__right'>
          <div className='ax-news-bar__nav'>
            <span className='ax-chip ax-news-bar__pill' data-variant='level'>
              PAGE :: {displayPage} / {displayPageCount}
            </span>
            <button type='button' className='ax-btn ghost ax-news-bar__btn' onClick={onPrevPage} disabled={!canGoPrev}>
              <span className='ax-news-bar__arrow' aria-hidden='true'>
                ←
              </span>
              Prev
            </button>
            <button type='button' className='ax-btn ghost ax-news-bar__btn' onClick={onNextPage} disabled={!canGoNext}>
              Next
              <span className='ax-news-bar__arrow' aria-hidden='true'>
                →
              </span>
            </button>
          </div>
        </div>
      </div>

      {drawerOpen ? (
        <div className='ax-news-drawer' role='region' aria-label='Advanced filters'>
          <div className='ax-news-drawer__hint'>
            <span className='ax-chip' data-variant='ghost'>
              ADVANCED FILTERS
            </span>
            <span className='ax-news-drawer__text'>Tags, date ranges, source and language will land here in v2.1.</span>
          </div>
        </div>
      ) : null}
    </section>
  )
}

type FeedRowProps = {
  item: NewsItem
  active: boolean
  pinned: boolean
  read: boolean
  onSelect: () => void
}

function FeedRow({ item, active, pinned, read, onSelect }: FeedRowProps) {
  const variant = resolveKindVariant(item.kind)
  const kindLabel = (item.kind || 'news').toUpperCase()
  const tags = item.tags ?? []
  const visibleTags = tags.slice(0, 3)
  const rest = Math.max(0, tags.length - visibleTags.length)

  return (
    <button
      type='button'
      className='ax-news-row'
      onClick={onSelect}
      data-active={active ? 'true' : undefined}
      data-read={read ? 'true' : undefined}
      data-pinned={pinned ? 'true' : undefined}
      role='option'
      aria-selected={active}
    >
      <span className='ax-news-row__dot' aria-hidden='true' />
      <span className='ax-chip ax-news-row__kind' data-variant={variant}>
        {kindLabel}
      </span>
      <span className='ax-news-row__date'>{item.date}</span>
      <span className='ax-news-row__title'>{item.title}</span>
      <span className='ax-news-row__summary'>{item.summary || ''}</span>
      <span className='ax-news-row__tags' aria-label='tags'>
        {visibleTags.map((tag) => (
          <span key={tag} className='ax-chip ax-news-row__tag' data-variant='ghost'>
            {tag.toUpperCase()}
          </span>
        ))}
        {rest ? (
          <span className='ax-chip ax-news-row__tag' data-variant='level'>
            +{rest}
          </span>
        ) : null}
      </span>
      <span className='ax-news-row__flags' aria-label='flags'>
        {pinned ? <span className='ax-chip ax-news-row__flag' data-variant='level'>PIN</span> : null}
        {!read ? <span className='ax-chip ax-news-row__flag' data-variant='warn'>UNREAD</span> : null}
      </span>
    </button>
  )
}

export default function NewsPage() {
  const session = useSession()
  const userId = session.user?.id ?? null
  const location = useLocation()

  const keys = useMemo(() => newsV2Keys(userId), [userId])
  const storage = typeof window !== 'undefined' ? window.localStorage : undefined

  const [readIds, setReadIds] = useState<Set<string>>(() => new Set())
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => new Set())
  const [lastSeenAt, setLastSeenAt] = useState<string | null>(null)

  useEffect(() => {
    setReadIds(readIdSet(storage, keys.readIds))
    setPinnedIds(readIdSet(storage, keys.pinnedIds))
    setLastSeenAt(readTimestamp(storage, keys.lastSeenAt))
  }, [keys.lastSeenAt, keys.pinnedIds, keys.readIds])

  useEffect(() => {
    writeIdSet(storage, keys.readIds, readIds)
  }, [keys.readIds, readIds])

  useEffect(() => {
    writeIdSet(storage, keys.pinnedIds, pinnedIds)
  }, [keys.pinnedIds, pinnedIds])

  useEffect(() => {
    return () => {
      writeTimestamp(storage, keys.lastSeenAt, new Date().toISOString())
    }
  }, [keys.lastSeenAt])

  const [items, setItems] = useState<NewsItem[]>([])
  const [rawQuery, setRawQuery] = useState('')
  const [q, setQ] = useState('')
  const [kind, setKind] = useState<'' | NewsKind>('')
  const [sort, setSort] = useState<SortOrder>('newest')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [pinnedOnly, setPinnedOnly] = useState(false)
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [manualSelectionSeq, setManualSelectionSeq] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [signalTab, setSignalTab] = useState<SignalTab>('summary')
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
    const timer = window.setTimeout(() => {
      setQ(rawQuery.trim())
    }, 200)
    return () => window.clearTimeout(timer)
  }, [rawQuery])

  useEffect(() => {
    setPage(1)
  }, [q, kind, pageSize, sort, pinnedOnly, unreadOnly])

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    return items
      .filter((item) => matchesQuery(item, term))
      .filter((item) => (!kind ? true : item.kind === kind))
      .filter((item) => (unreadOnly ? !readIds.has(item.id) : true))
      .filter((item) => (pinnedOnly ? pinnedIds.has(item.id) : true))
  }, [items, q, kind, unreadOnly, readIds, pinnedOnly, pinnedIds])

  const newestFirst = useMemo(() => {
    const list = [...filtered]
    list.sort(compareDatesDesc)
    return list
  }, [filtered])

  const sortedItems = useMemo(() => {
    if (sort === 'newest') return newestFirst
    return [...newestFirst].sort(compareDatesAsc)
  }, [newestFirst, sort])

  useEffect(() => {
    if (!selectedId) return
    if (sortedItems.some((it) => it.id === selectedId)) return
    setSelectedId(null)
  }, [selectedId, sortedItems])

  const totalPages = Math.max(1, Math.ceil(sortedItems.length / pageSize))

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const pageItems = sortedItems.slice((page - 1) * pageSize, page * pageSize)

  const newsTotal = items.length
  const visibleTotal = sortedItems.length
  const unreadTotal = useMemo(() => sortedItems.filter((it) => !readIds.has(it.id)).length, [sortedItems, readIds])
  const newTotal = useMemo(() => countNewSince(items, lastSeenAt), [items, lastSeenAt])
  const pinnedTotal = useMemo(() => pinnedIds.size, [pinnedIds])

  const activeItem = useMemo(() => {
    if (selectedId) {
      const hit = sortedItems.find((it) => it.id === selectedId)
      if (hit) return hit
    }
    return sortedItems[0] ?? null
  }, [selectedId, sortedItems])

  const mode: SignalCenterProps['mode'] = useMemo(() => {
    if (selectedId) return 'selected'
    if (pinnedOnly) return 'pinned'
    return 'latest'
  }, [selectedId, pinnedOnly])

  const activeIndex = useMemo(() => {
    if (!activeItem) return -1
    return sortedItems.findIndex((it) => it.id === activeItem.id)
  }, [sortedItems, activeItem])

  const canPrev = activeIndex > 0
  const canNext = activeIndex >= 0 && activeIndex < sortedItems.length - 1

  const currentPath = location.pathname
  const resolvedLink = resolveActionLink(activeItem?.link, currentPath)

  const autoplayIntervalSec = useMemo(() => {
    const params = new URLSearchParams(location.search)
    const raw = params.get('autoplay')
    if (!raw) return DEFAULT_AUTOPLAY_INTERVAL_SEC
    const n = Number(raw)
    if (!Number.isFinite(n)) return DEFAULT_AUTOPLAY_INTERVAL_SEC
    return Math.min(30, Math.max(2, Math.round(n)))
  }, [location.search])

  const markRead = (id: string) => {
    setReadIds((prev) => {
      if (prev.has(id)) return prev
      const next = new Set(prev)
      next.add(id)
      return next
    })
  }

  const togglePinned = (id: string) => {
    setPinnedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleRead = (id: string) => {
    setReadIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSelect = (item: NewsItem) => {
    setSelectedId(item.id)
    markRead(item.id)
    setManualSelectionSeq((v) => v + 1)
  }

  const handlePrevItem = () => {
    if (!canPrev) return
    const nextItem = sortedItems[activeIndex - 1]
    if (!nextItem) return
    setSelectedId(nextItem.id)
    markRead(nextItem.id)
  }

  const handleNextItem = () => {
    if (!canNext) return
    const nextItem = sortedItems[activeIndex + 1]
    if (!nextItem) return
    setSelectedId(nextItem.id)
    markRead(nextItem.id)
  }

  const handlePrevPage = () => setPage((prev) => Math.max(1, prev - 1))
  const handleNextPage = () => setPage((prev) => Math.min(totalPages, prev + 1))

  const handleMarkAllRead = () => {
    setReadIds((prev) => {
      const next = new Set(prev)
      sortedItems.forEach((it) => next.add(it.id))
      return next
    })
  }

  const pinnedActive = activeItem ? pinnedIds.has(activeItem.id) : false
  const readActive = activeItem ? readIds.has(activeItem.id) : false

  return (
    <section className='ax-container ax-section ax-news-signal' aria-busy={busy} data-density='compact'>
      <div className='ax-news-signal__stack'>
        <div className='ax-news-signal__hero-row'>
          <NewsDispatchPanel
            busy={busy}
            pinnedOnly={pinnedOnly}
            unreadOnly={unreadOnly}
            onTogglePinnedOnly={() => setPinnedOnly((v) => !v)}
            onToggleUnreadOnly={() => setUnreadOnly((v) => !v)}
            onMarkAllRead={handleMarkAllRead}
            total={newsTotal}
            visible={visibleTotal}
            unread={unreadTotal}
            fresh={newTotal}
            pinned={pinnedTotal}
            page={page}
            pageCount={sortedItems.length ? totalPages : 0}
          />

          <SignalCenter
            busy={busy}
            mode={mode}
            item={activeItem}
            tab={signalTab}
            pinned={pinnedActive}
            read={readActive}
            autoplayIntervalSec={autoplayIntervalSec}
            manualSelectionSeq={manualSelectionSeq}
            resolvedLink={resolvedLink}
            canPrev={canPrev}
            canNext={canNext}
            onPrev={handlePrevItem}
            onNext={handleNextItem}
            onSelectTab={setSignalTab}
            onTogglePinned={() => (activeItem ? togglePinned(activeItem.id) : undefined)}
            onToggleRead={() => (activeItem ? toggleRead(activeItem.id) : undefined)}
          />
        </div>

        <NewsToolbar
          busy={busy}
          q={rawQuery}
          kind={kind}
          sort={sort}
          pageSize={pageSize}
          page={page}
          pageCount={sortedItems.length ? totalPages : 0}
          onQueryChange={setRawQuery}
          onKindChange={(value) => {
            setKind(value)
          }}
          onSortChange={setSort}
          onPageSizeChange={setPageSize}
          onPrevPage={handlePrevPage}
          onNextPage={handleNextPage}
        />

        {err ? (
          <div className='ax-dashboard__alert' role='alert'>
            {err}
          </div>
        ) : null}

        <div className='ax-news-feed' role='listbox' aria-label='News feed'>
          {busy && items.length === 0 ? (
            Array.from({ length: 6 }).map((_, index) => (
              <div key={`skeleton-${index}`} className='ax-news-row ax-news-row--skeleton' aria-hidden='true' />
            ))
          ) : pageItems.length === 0 ? (
            <div className='ax-card ax-news-empty'>
              <h3 className='ax-blade-head'>No items found</h3>
              <p className='ax-news-card__summary'>Adjust filters or add new content in the NEWS module.</p>
            </div>
          ) : (
            pageItems.map((item) => (
              <FeedRow
                key={item.id}
                item={item}
                active={Boolean(activeItem && item.id === activeItem.id)}
                pinned={pinnedIds.has(item.id)}
                read={readIds.has(item.id)}
                onSelect={() => handleSelect(item)}
              />
            ))
          )}
        </div>
      </div>
    </section>
  )
}
