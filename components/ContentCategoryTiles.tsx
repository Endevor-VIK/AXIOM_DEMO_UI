import React, { useCallback, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

export type CategoryKey =
  | 'all'
  | 'locations'
  | 'characters'
  | 'technologies'
  | 'factions'
  | 'events'
  | 'lore'

export interface CategoryStat {
  key: CategoryKey
  title: string
  count: number
  to: string
  icon?: React.ReactNode
}

interface ContentCategoryTilesProps {
  items: CategoryStat[]
  active?: CategoryKey
  loading?: boolean
}

const iconMap: Record<CategoryKey, React.ReactElement> = {
  all: (
    <svg viewBox='0 0 24 24' focusable='false' aria-hidden='true'>
      <rect x='3.25' y='3.25' width='7.5' height='7.5' rx='1.6' fill='none' stroke='currentColor' strokeWidth='1.5' />
      <rect x='10.75' y='10.75' width='7.5' height='7.5' rx='1.6' fill='none' stroke='currentColor' strokeWidth='1.5' />
      <rect x='6.5' y='14.5' width='5.5' height='5.5' rx='1.4' fill='currentColor' opacity='0.25' />
    </svg>
  ),
  locations: (
    <svg viewBox='0 0 24 24' focusable='false' aria-hidden='true'>
      <path
        d='M12 21c0 0 6-6.2 6-11a6 6 0 1 0-12 0c0 4.8 6 11 6 11z'
        fill='none'
        stroke='currentColor'
        strokeWidth='1.5'
        strokeLinejoin='round'
      />
      <circle cx='12' cy='10' r='2.4' fill='none' stroke='currentColor' strokeWidth='1.5' />
    </svg>
  ),
  characters: (
    <svg viewBox='0 0 24 24' focusable='false' aria-hidden='true'>
      <circle cx='12' cy='9.5' r='3' fill='none' stroke='currentColor' strokeWidth='1.5' />
      <path d='M7 19c0-2.9 2.6-4.8 5-4.8s5 1.9 5 4.8' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' />
      <circle cx='6.5' cy='12' r='1.7' fill='currentColor' opacity='0.25' />
    </svg>
  ),
  technologies: (
    <svg viewBox='0 0 24 24' focusable='false' aria-hidden='true'>
      <rect x='4.5' y='5.5' width='15' height='13' rx='2.2' fill='none' stroke='currentColor' strokeWidth='1.5' />
      <path d='M8.5 9h7m-7 3h7m-7 3h4' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' />
      <circle cx='7' cy='9' r='0.9' fill='currentColor' />
      <circle cx='7' cy='12' r='0.9' fill='currentColor' />
      <circle cx='7' cy='15' r='0.9' fill='currentColor' />
    </svg>
  ),
  factions: (
    <svg viewBox='0 0 24 24' focusable='false' aria-hidden='true'>
      <path
        d='M12 21c5-2.1 8-5.3 8-9.4V6.2L12 3 4 6.2v5.4c0 4.1 3 7.3 8 9.4z'
        fill='none'
        stroke='currentColor'
        strokeWidth='1.5'
        strokeLinejoin='round'
      />
      <path d='M12 7.5V15' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' />
      <path d='M9 12h6' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' />
    </svg>
  ),
  events: (
    <svg viewBox='0 0 24 24' focusable='false' aria-hidden='true'>
      <rect x='4' y='6' width='16' height='13' rx='2' fill='none' stroke='currentColor' strokeWidth='1.5' />
      <path d='M4 10h16' fill='none' stroke='currentColor' strokeWidth='1.5' />
      <path d='M8 4v4m8-4v4' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' />
      <rect x='8' y='13' width='3' height='3' rx='0.7' fill='currentColor' opacity='0.25' />
      <rect x='13' y='13' width='3' height='3' rx='0.7' fill='currentColor' opacity='0.25' />
    </svg>
  ),
  lore: (
    <svg viewBox='0 0 24 24' focusable='false' aria-hidden='true'>
      <path
        d='M12 5.5h7v13.5l-5.3-1.9a4.4 4.4 0 0 0-2.7 0l-5 1.8V5.5h6z'
        fill='none'
        stroke='currentColor'
        strokeWidth='1.5'
        strokeLinejoin='round'
      />
      <path d='M12 5.5v12.4' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' />
      <path d='M9 8.5h6' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' />
      <path d='M9 11.5h6' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' />
    </svg>
  ),
}

export default function ContentCategoryTiles({ items, active, loading = false }: ContentCategoryTilesProps) {
  const navigate = useNavigate()
  const tileRefs = useRef<(HTMLButtonElement | null)[]>([])

  const entries = useMemo(() => {
    return items.map((item) => ({
      ...item,
      icon: item.icon ?? iconMap[item.key],
    }))
  }, [items])

  const selectedKey = useMemo(() => {
    if (!entries.length) return undefined
    if (active && entries.some((item) => item.key === active)) return active
    return entries[0]?.key
  }, [entries, active])

  tileRefs.current = entries.map((_, index) => tileRefs.current[index] ?? null)

  const handleActivate = useCallback(
    (target: string) => {
      navigate(target, { replace: false })
    },
    [navigate]
  )

  const focusTile = useCallback((index: number) => {
    tileRefs.current[index]?.focus()
  }, [])

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
      if (!entries.length) return
      let nextIndex = -1
      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          nextIndex = (index + 1) % entries.length
          break
        case 'ArrowLeft':
        case 'ArrowUp':
          nextIndex = (index - 1 + entries.length) % entries.length
          break
        case 'Home':
          nextIndex = 0
          break
        case 'End':
          nextIndex = entries.length - 1
          break
        default:
          return
      }
      event.preventDefault()
      focusTile(nextIndex)
      handleActivate(entries[nextIndex]!.to)
    },
    [entries, focusTile, handleActivate]
  )

  if (loading && entries.length === 0) {
    return (
      <div className='ax-cats' role='status'>
        <div className='ax-card cat'>
          <div className='cat-ico' aria-hidden='true'>{iconMap.all}</div>
          <div className='cat-title'>Loading…</div>
          <div className='cat-meta'>
            <span className='ax-chip' data-variant='info'>WAIT</span>
          </div>
        </div>
      </div>
    )
  }

  if (!entries.length) {
    return (
      <div className='ax-cats' role='status'>
        <div className='ax-card cat'>
          <div className='cat-ico' aria-hidden='true'>{iconMap.all}</div>
          <div className='cat-title'>No categories yet</div>
          <div className='cat-meta'>
            <span className='ax-chip' data-variant='warn'>EMPTY</span>
          </div>
          <p className='cat-empty'>No entries</p>
        </div>
      </div>
    )
  }

  return (
    <div className='ax-cats' role='tablist' aria-label='Content categories'>
      {entries.map((item, index) => {
        const selected = item.key === selectedKey
        return (
          <button
            key={item.key}
            ref={(node) => {
              tileRefs.current[index] = node
            }}
            type='button'
            className={`ax-card cat${selected ? ' active' : ''}`}
            role='tab'
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => handleActivate(item.to)}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            <div className='cat-ico' aria-hidden='true'>
              {item.icon}
            </div>
            <div className='cat-title'>
              <span className='ax-link-underline'>{item.title}</span>
            </div>
            <div className='cat-meta'>
              <span className='ax-chip' data-variant='level'>
                {item.count}
              </span>
              {item.count === 0 ? <span className='ax-chip' data-variant='info'>EMPTY</span> : null}
            </div>
            {item.count === 0 ? <p className='cat-empty'>No entries</p> : null}
          </button>
        )
      })}
    </div>
  )
}
