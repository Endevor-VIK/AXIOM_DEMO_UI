import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { readChronicleManifest, type ChronicleChapter, type ChronicleManifest } from '@/lib/chronicle'

import ChronicleOrbit from './ChronicleOrbit'

import '@/styles/chronicle-hub.css'

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true
    return window.matchMedia(query).matches
  })

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

function normalizeChapterParam(value: string | null): string {
  return (value ?? '').trim().toLowerCase()
}

function getActiveChapter(chapters: ChronicleChapter[], chapterSlug: string): ChronicleChapter | null {
  if (!chapters.length) return null
  if (!chapterSlug) return chapters[0] ?? null
  return chapters.find((chapter) => chapter.slug === chapterSlug) ?? chapters[0] ?? null
}

export default function ChronicleHub() {
  const [manifest, setManifest] = useState<ChronicleManifest | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  const isDesktop = useMediaQuery('(min-width: 960px)')
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')

  useEffect(() => {
    let alive = true
    setLoading(true)

    readChronicleManifest()
      .then((next) => {
        if (!alive) return
        setManifest(next)
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

  const chapters = manifest?.chapters ?? []
  const chapterSlugParam = normalizeChapterParam(searchParams.get('chapter'))
  const activeChapter = useMemo(
    () => getActiveChapter(chapters, chapterSlugParam),
    [chapters, chapterSlugParam],
  )

  useEffect(() => {
    if (!chapters.length) return
    if (chapterSlugParam && chapters.some((chapter) => chapter.slug === chapterSlugParam)) {
      return
    }

    const fallback = chapters[0]
    if (!fallback) return
    const next = new URLSearchParams(searchParams)
    next.set('chapter', fallback.slug)
    setSearchParams(next, { replace: true })
  }, [chapters, chapterSlugParam, searchParams, setSearchParams])

  const selectChapter = useCallback(
    (chapter: ChronicleChapter) => {
      const next = new URLSearchParams(searchParams)
      next.set('chapter', chapter.slug)
      setSearchParams(next, { replace: true })
    },
    [searchParams, setSearchParams],
  )

  const openChapter = useCallback(() => {
    if (!activeChapter) return
    navigate(activeChapter.targetRoute)
  }, [activeChapter, navigate])

  const totalEvents = useMemo(
    () => chapters.reduce((sum, chapter) => sum + chapter.keyEvents.length, 0),
    [chapters],
  )

  return (
    <section className='ax-chronicle' aria-busy={loading}>
      <header className='ax-chronicle__head'>
        <p className='ax-chronicle__eyebrow'>CHRONICLE // STORY CHANNEL</p>
        <h1 className='ax-blade-head'>NARRATIVE ORBIT</h1>
        <p className='ax-muted'>
          Минималистичный хаб выбора главы. Без медиа-превью: только структура, сигнал и
          быстрый переход к самостоятельным chapter-страницам.
        </p>
        <div className='ax-chronicle__head-tags'>
          <span className='ax-chip'>DRAFT</span>
          <span className='ax-chip'>CANON/V3</span>
          <span className='ax-chip'>ORBIT NAV</span>
        </div>
      </header>

      {loading ? <div className='ax-skeleton'>Loading CHRONICLE manifest…</div> : null}
      {!loading && error ? (
        <div className='ax-dashboard__alert' role='alert'>
          Chronicle manifest error: {error}
        </div>
      ) : null}
      {!loading && !error && chapters.length === 0 ? (
        <div className='ax-muted'>No chapters yet. Add entries to `public/data/chronicle/manifest.json`.</div>
      ) : null}

      {!loading && !error && activeChapter ? (
        <div className='ax-chronicle__shell'>
          <aside className='ax-chronicle__rail ax-card' aria-label='Chronicle telemetry'>
            <p className='ax-chronicle__rail-eyebrow'>PHASE</p>
            <h2 className='ax-chronicle__rail-title'>DRAFT ARCHIVE</h2>
            <ul className='ax-chronicle__telemetry'>
              <li>
                <span>Chapters</span>
                <strong>{chapters.length}</strong>
              </li>
              <li>
                <span>Events</span>
                <strong>{totalEvents}</strong>
              </li>
              <li>
                <span>Active</span>
                <strong>{activeChapter.chapterCode}</strong>
              </li>
            </ul>
            <div className='ax-chronicle__rail-actions'>
              <Link to='/dashboard/content/lore' className='ax-btn ghost'>
                OPEN LORE
              </Link>
              <Link to='/dashboard/news' className='ax-btn ghost'>
                SIGNAL FEED
              </Link>
            </div>
          </aside>

          <div className='ax-chronicle__stage ax-card' aria-label='Chronicle Orbit stage'>
            <div className='ax-chronicle__stage-head'>
              <p>SELECT CHAPTER</p>
              <span>{activeChapter.status.toUpperCase()} · ARROW/WHEEL/SWIPE</span>
            </div>
            <ChronicleOrbit
              chapters={chapters}
              activeId={activeChapter.id}
              onSelect={selectChapter}
              reducedMotion={reducedMotion || !isDesktop}
            />
          </div>

          <aside className='ax-chronicle__panel ax-card' aria-label='Chapter quick details'>
            <div className='ax-chronicle-card__signal' data-tone={activeChapter.tone}>
              <span className='ax-chronicle-card__signal-code'>{activeChapter.chapterCode}</span>
              <span className='ax-chronicle-card__signal-mark' aria-hidden>
                ◉
              </span>
              <span className='ax-chronicle-card__signal-title'>{activeChapter.title}</span>
            </div>

            <div className='ax-chronicle-card__meta'>
              <span className='ax-chip'>{activeChapter.chapterCode}</span>
              <span className='ax-chip' data-variant='accent'>
                {activeChapter.status.toUpperCase()}
              </span>
            </div>
            <h2>{activeChapter.title}</h2>
            <p className='ax-chronicle-card__hook'>{activeChapter.hook}</p>
            <p className='ax-chronicle-card__summary'>{activeChapter.summary || 'Summary pending.'}</p>
            <p className='ax-chronicle-card__slug' data-testid='chronicle-active-slug'>
              {activeChapter.slug}
            </p>

            <div className='ax-chronicle-card__group'>
              <h3>Key Events</h3>
              <ul>
                {activeChapter.keyEvents.map((eventName) => (
                  <li key={eventName}>{eventName}</li>
                ))}
              </ul>
            </div>

            <div className='ax-chronicle-card__group'>
              <h3>Main Characters</h3>
              <ul>
                {activeChapter.mainCharacters.map((character) => (
                  <li key={character}>{character}</li>
                ))}
              </ul>
            </div>

            <div className='ax-chronicle-card__group'>
              <h3>Locations</h3>
              <ul>
                {activeChapter.locations.map((location) => (
                  <li key={location}>{location}</li>
                ))}
              </ul>
            </div>

            <div className='ax-chronicle-card__actions'>
              <button type='button' className='ax-btn' onClick={openChapter}>
                OPEN DRAFT CHAPTER
              </button>
              {activeChapter.siteLinks[0] ? (
                <Link to={activeChapter.siteLinks[0]} className='ax-btn ghost'>
                  RELATED CONTEXT
                </Link>
              ) : null}
            </div>
          </aside>
        </div>
      ) : null}
    </section>
  )
}
