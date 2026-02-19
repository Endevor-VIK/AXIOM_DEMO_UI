import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { ChronicleChapter } from '@/lib/chronicle'

const ORBIT_GLYPHS = ['◉', '◌', '⬢', '◈', '◎', '◍', '◒', '◬']

function mod(value: number, count: number): number {
  if (count <= 0) return 0
  const next = value % count
  return next < 0 ? next + count : next
}

function chapterVariant(seed: string): number {
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash) % 4
}

function chapterGlyph(seed: string): string {
  const idx = chapterVariant(seed)
  return ORBIT_GLYPHS[idx] ?? '◉'
}

function shortTitle(value: string, max = 28): string {
  if (value.length <= max) return value
  return `${value.slice(0, max - 1)}…`
}

function chapterOrdinal(value: number): string {
  return value < 10 ? `0${value}` : String(value)
}

export interface ChronicleOrbitProps {
  chapters: ChronicleChapter[]
  activeId: string
  onSelect: (chapter: ChronicleChapter) => void
  reducedMotion: boolean
}

export default function ChronicleOrbit({
  chapters,
  activeId,
  onSelect,
  reducedMotion,
}: ChronicleOrbitProps) {
  const wheelLockRef = useRef<number | null>(null)
  const pointerStartRef = useRef<number | null>(null)
  const pointerStartYRef = useRef<number | null>(null)
  const [isShifting, setIsShifting] = useState(false)

  const activeIndex = useMemo(() => {
    const idx = chapters.findIndex((chapter) => chapter.id === activeId)
    return idx >= 0 ? idx : 0
  }, [activeId, chapters])

  const activeChapter = chapters[activeIndex] ?? null

  const selectByOffset = useCallback(
    (offset: number) => {
      if (!chapters.length) return
      const next = chapters[mod(activeIndex + offset, chapters.length)]
      if (next) onSelect(next)
    },
    [activeIndex, chapters, onSelect],
  )

  const handleWheel = useCallback(
    (event: React.WheelEvent<HTMLDivElement>) => {
      if (!chapters.length) return
      event.preventDefault()
      if (wheelLockRef.current !== null) return
      const direction = event.deltaY > 0 ? 1 : -1
      selectByOffset(direction)
      wheelLockRef.current = window.setTimeout(() => {
        wheelLockRef.current = null
      }, 220)
    },
    [chapters.length, selectByOffset],
  )

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    pointerStartRef.current = event.clientX
    pointerStartYRef.current = event.clientY
  }, [])

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!chapters.length) return
      const startX = pointerStartRef.current
      const startY = pointerStartYRef.current
      pointerStartRef.current = null
      pointerStartYRef.current = null
      if (startX === null) return
      const delta = event.clientX - startX
      const deltaY = startY === null ? 0 : event.clientY - startY
      if (Math.abs(delta) < 36 || Math.abs(delta) < Math.abs(deltaY)) return
      selectByOffset(delta < 0 ? -1 : 1)
    },
    [chapters.length, selectByOffset],
  )

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (!chapters.length) return
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        selectByOffset(1)
        return
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        selectByOffset(-1)
      }
    },
    [chapters.length, selectByOffset],
  )

  useEffect(() => {
    return () => {
      if (wheelLockRef.current !== null) {
        window.clearTimeout(wheelLockRef.current)
      }
    }
  }, [])

  if (!chapters.length || !activeChapter) {
    return <div className='ax-chronicle-orbit ax-chronicle-orbit--empty'>No chapters.</div>
  }

  const prevChapter = chapters[mod(activeIndex - 1, chapters.length)] ?? activeChapter
  const nextChapter = chapters[mod(activeIndex + 1, chapters.length)] ?? activeChapter
  const activeOptionId = `chronicle-orbit-${activeChapter.id}`

  useEffect(() => {
    setIsShifting(true)
    const timer = window.setTimeout(() => setIsShifting(false), 280)
    return () => window.clearTimeout(timer)
  }, [activeChapter.id])

  if (reducedMotion) {
    return (
      <div className='ax-chronicle-orbit ax-chronicle-orbit--fallback' aria-label='Orbit view (reduced motion)'>
        <div className='ax-chronicle-orbit__fallback-note'>Orbit disabled by Reduced Motion.</div>
        <div className='ax-chronicle-orbit__fallback-strip' role='listbox' aria-label='Orbit view'>
          {chapters.map((chapter) => {
            const active = chapter.id === activeChapter.id
            return (
              <button
                key={chapter.id}
                type='button'
                role='option'
                aria-selected={active}
                className='ax-chronicle-orbit__fallback-card'
                data-active={active ? 'true' : undefined}
                onClick={() => onSelect(chapter)}
              >
                <span className='ax-chronicle-orbit__fallback-visual' data-variant={chapterVariant(chapter.chapterCode)}>
                  <span className='ax-chronicle-orbit__fallback-glyph' aria-hidden>
                    {chapterGlyph(chapter.chapterCode)}
                  </span>
                </span>
                <span className='ax-chronicle-orbit__fallback-body'>
                  <span className='ax-chronicle-orbit__fallback-code'>{chapter.chapterCode}</span>
                  <span className='ax-chronicle-orbit__fallback-title'>{shortTitle(chapter.title)}</span>
                </span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div
      className='ax-chronicle-orbit'
      role='listbox'
      aria-label='Orbit view'
      aria-activedescendant={activeOptionId}
      tabIndex={0}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onKeyDown={handleKeyDown}
    >
      <div className='ax-chronicle-orbit__viewport'>
        <div className='ax-chronicle-orbit__index-rail' role='group' aria-label='Chapter index'>
          <div className='ax-chronicle-orbit__index-stack'>
            {chapters.map((chapter, index) => {
              const active = chapter.id === activeChapter.id
              return (
                <button
                  key={chapter.id}
                  type='button'
                  className='ax-chronicle-orbit__index-btn'
                  data-active={active ? 'true' : undefined}
                  aria-current={active ? 'true' : undefined}
                  onClick={() => onSelect(chapter)}
                >
                  <span className='ax-chronicle-orbit__index-glyph' aria-hidden>
                    {chapterGlyph(chapter.chapterCode)}
                  </span>
                  <span className='ax-chronicle-orbit__index-order'>{chapterOrdinal(index + 1)}</span>
                </button>
              )
            })}
          </div>
          <p className='ax-chronicle-orbit__index-title'>{shortTitle(activeChapter.title, 22)}</p>
        </div>

        <div className={`ax-chronicle-orbit__deck${isShifting ? ' is-shifting' : ''}`}>
          <p className='ax-chronicle-orbit__deck-label'>ORBIT CHANNEL</p>

          <button
            type='button'
            className='ax-chronicle-orbit__arrow is-left'
            aria-label='Previous chapter'
            onClick={() => selectByOffset(-1)}
          >
            ‹
          </button>

          <button
            type='button'
            className='ax-chronicle-orbit__arrow is-right'
            aria-label='Next chapter'
            onClick={() => selectByOffset(1)}
          >
            ›
          </button>

          <button
            type='button'
            role='option'
            aria-selected='false'
            className='ax-chronicle-orbit__edge is-prev'
            onClick={() => onSelect(prevChapter)}
          >
            <span className='ax-chronicle-orbit__edge-code'>{prevChapter.chapterCode}</span>
            <span className='ax-chronicle-orbit__edge-glyph' aria-hidden>
              {chapterGlyph(prevChapter.chapterCode)}
            </span>
            <span className='ax-chronicle-orbit__edge-title'>{shortTitle(prevChapter.title, 14)}</span>
          </button>

          <button
            id={activeOptionId}
            type='button'
            role='option'
            aria-selected='true'
            className='ax-chronicle-orbit__focus'
            data-testid={`orbit-option-${activeChapter.id}`}
            onClick={() => onSelect(activeChapter)}
          >
            <span className='ax-chronicle-orbit__focus-head'>
              <span>{activeChapter.chapterCode}</span>
              <span>{activeChapter.status.toUpperCase()}</span>
            </span>
            <span className='ax-chronicle-orbit__sigil' data-variant={chapterVariant(activeChapter.chapterCode)}>
              <span className='ax-chronicle-orbit__sigil-glyph' aria-hidden>
                {chapterGlyph(activeChapter.chapterCode)}
              </span>
            </span>
            <span className='ax-chronicle-orbit__focus-title'>{activeChapter.title}</span>
            <span className='ax-chronicle-orbit__focus-hook'>{activeChapter.hook}</span>
          </button>

          <button
            type='button'
            role='option'
            aria-selected='false'
            className='ax-chronicle-orbit__edge is-next'
            onClick={() => onSelect(nextChapter)}
          >
            <span className='ax-chronicle-orbit__edge-code'>{nextChapter.chapterCode}</span>
            <span className='ax-chronicle-orbit__edge-glyph' aria-hidden>
              {chapterGlyph(nextChapter.chapterCode)}
            </span>
            <span className='ax-chronicle-orbit__edge-title'>{shortTitle(nextChapter.title, 14)}</span>
          </button>
        </div>
      </div>

      <div className='ax-chronicle-orbit__timeline' role='group' aria-label='Quick chapter switch'>
        {chapters.map((chapter, index) => {
          const active = chapter.id === activeChapter.id
          return (
            <button
              key={chapter.id}
              type='button'
              className='ax-chronicle-orbit__timeline-btn'
              data-active={active ? 'true' : undefined}
              aria-pressed={active}
              onClick={() => onSelect(chapter)}
            >
              <span className='ax-chronicle-orbit__timeline-index'>{chapterOrdinal(index + 1)}</span>
              <span>{shortTitle(chapter.title, 26)}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
