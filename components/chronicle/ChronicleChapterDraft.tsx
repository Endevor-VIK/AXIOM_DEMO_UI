import React, { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import {
  readChronicleManifest,
  type ChronicleChapter,
  type ChronicleManifest,
} from '@/lib/chronicle'

import '@/styles/chronicle-hub.css'

function findChapterBySlug(
  chapters: ChronicleChapter[],
  slug: string | undefined,
): { chapter: ChronicleChapter | null; index: number } {
  if (!slug) return { chapter: null, index: -1 }
  const idx = chapters.findIndex((entry) => entry.slug === slug)
  if (idx < 0) return { chapter: null, index: -1 }
  return { chapter: chapters[idx] ?? null, index: idx }
}

export default function ChronicleChapterDraft() {
  const { chapterSlug } = useParams<{ chapterSlug: string }>()
  const [manifest, setManifest] = useState<ChronicleManifest | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
  }, [chapterSlug])

  const chapters = manifest?.chapters ?? []
  const { chapter, index } = useMemo(
    () => findChapterBySlug(chapters, chapterSlug),
    [chapters, chapterSlug],
  )

  const previousChapter = index > 0 ? chapters[index - 1] ?? null : null
  const nextChapter = index >= 0 ? chapters[index + 1] ?? null : null

  if (loading) {
    return (
      <section className='ax-chronicle ax-chronicle-chapter' aria-busy='true'>
        <div className='ax-skeleton'>Loading chapter draft…</div>
      </section>
    )
  }

  if (error) {
    return (
      <section className='ax-chronicle ax-chronicle-chapter'>
        <div className='ax-dashboard__alert' role='alert'>
          Chronicle chapter error: {error}
        </div>
      </section>
    )
  }

  if (!chapter) {
    return (
      <section className='ax-chronicle ax-chronicle-chapter'>
        <header className='ax-chronicle__head'>
          <p className='ax-chronicle__eyebrow'>CHRONICLE // CHAPTER</p>
          <h1 className='ax-blade-head'>DRAFT NOT FOUND</h1>
          <p className='ax-muted'>Нужная глава ещё не добавлена в manifest или slug указан неверно.</p>
        </header>
        <div className='ax-chronicle-card__actions'>
          <Link to='/dashboard/chronicle' className='ax-btn ghost'>
            BACK TO HUB
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section className='ax-chronicle ax-chronicle-chapter'>
      <header className='ax-chronicle__head'>
        <p className='ax-chronicle__eyebrow'>CHRONICLE // STANDALONE DRAFT</p>
        <h1 className='ax-blade-head'>
          {chapter.chapterCode} · {chapter.title}
        </h1>
        <p className='ax-muted'>
          Страница главы в draft-режиме. В следующих итерациях получит отдельный visual profile и
          сцены.
        </p>
      </header>

      <article className='ax-chronicle-chapter__hero' data-tone={chapter.tone}>
        <p className='ax-chronicle-chapter__status'>STATUS :: {chapter.status.toUpperCase()}</p>
        <h2>{chapter.hook}</h2>
        <p>{chapter.summary || 'Summary will be expanded in R2.'}</p>
        <div className='ax-chronicle-card__actions'>
          <Link to={`/dashboard/chronicle?chapter=${encodeURIComponent(chapter.slug)}`} className='ax-btn ghost'>
            BACK TO HUB
          </Link>
          {nextChapter ? (
            <Link to={nextChapter.targetRoute} className='ax-btn'>
              NEXT DRAFT
            </Link>
          ) : null}
        </div>
      </article>

      <div className='ax-chronicle-chapter__grid'>
        <article className='ax-card ax-chronicle-chapter__panel'>
          <h3>Key Events</h3>
          <ul>
            {chapter.keyEvents.map((eventName) => (
              <li key={eventName}>{eventName}</li>
            ))}
          </ul>
        </article>

        <article className='ax-card ax-chronicle-chapter__panel'>
          <h3>Main Characters</h3>
          <ul>
            {chapter.mainCharacters.map((character) => (
              <li key={character}>{character}</li>
            ))}
          </ul>
        </article>

        <article className='ax-card ax-chronicle-chapter__panel'>
          <h3>Locations</h3>
          <ul>
            {chapter.locations.map((location) => (
              <li key={location}>{location}</li>
            ))}
          </ul>
        </article>

        <article className='ax-card ax-chronicle-chapter__panel'>
          <h3>Canon Refs</h3>
          <ul>
            {chapter.canonRefs.length > 0 ? (
              chapter.canonRefs.map((ref) => <li key={ref}>{ref}</li>)
            ) : (
              <li>Pending canon links.</li>
            )}
          </ul>
        </article>
      </div>

      <footer className='ax-chronicle-chapter__footer'>
        {previousChapter ? (
          <Link to={previousChapter.targetRoute} className='ax-btn ghost'>
            PREV: {previousChapter.chapterCode}
          </Link>
        ) : (
          <span />
        )}
        <span className='ax-muted'>STYLE PROFILE :: {chapter.styleProfile}</span>
        {chapter.siteLinks[0] ? (
          <Link to={chapter.siteLinks[0]} className='ax-btn ghost'>
            RELATED LINK
          </Link>
        ) : (
          <span />
        )}
      </footer>
    </section>
  )
}
