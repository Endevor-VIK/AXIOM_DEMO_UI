// AXIOM_DEMO_UI — FAVORITES
// Route: /favorites

import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { formatDate, safeText } from '@/components/utils'
import { useFavorites } from '@/lib/identity/useFavorites'
import type { FavoriteItem, FavoriteType } from '@/lib/identity/types'

type FilterValue = FavoriteType | 'all'

const TYPE_FILTERS: Array<{ value: FilterValue; label: string }> = [
  { value: 'all', label: 'ALL' },
  { value: 'content', label: 'CONTENT' },
  { value: 'character', label: 'CHARACTERS' },
  { value: 'location', label: 'LOCATIONS' },
  { value: 'technology', label: 'TECH' },
  { value: 'faction', label: 'FACTIONS' },
  { value: 'event', label: 'EVENTS' },
  { value: 'lore', label: 'LORE' },
]

function matches(item: FavoriteItem, q: string): boolean {
  const term = q.trim().toLowerCase()
  if (!term) return true
  const haystack = [item.title, item.route, item.id, ...(item.tags ?? [])]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return haystack.includes(term)
}

function typeLabel(type: FavoriteType): string {
  switch (type) {
    case 'character':
      return 'Character'
    case 'location':
      return 'Location'
    case 'technology':
      return 'Tech'
    case 'faction':
      return 'Faction'
    case 'event':
      return 'Event'
    case 'lore':
      return 'Lore'
    case 'content':
      return 'Content'
    default:
      return 'Other'
  }
}

export default function FavoritesPage() {
  const { favorites, removeFavorite } = useFavorites()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<FilterValue>('all')
  const navigate = useNavigate()

  const filtered = useMemo(() => {
    return favorites.filter((item) => (filter === 'all' ? true : item.type === filter) && matches(item, query))
  }, [favorites, filter, query])

  const handleOpen = (item: FavoriteItem) => {
    navigate(item.route)
  }

  const handleUnpin = (item: FavoriteItem) => {
    removeFavorite(item.key)
  }

  return (
    <section className='ax-container ax-section'>
      <div className='ax-stack'>
        <header className='ax-card ghost ax-favorites-head'>
          <div className='ax-favorites-head__text'>
            <p className='ax-muted'>FAVORITES · DEMO STORAGE</p>
            <h1 className='ax-blade-head'>Pinned items</h1>
            <p className='ax-muted'>
              Items are stored locally (`ax_favorites_v1`). Use search and filters to locate entries quickly.
            </p>
          </div>
          <div className='ax-favorites-controls'>
            <label className='visually-hidden' htmlFor='favorites-search'>
              Search favorites
            </label>
            <input
              id='favorites-search'
              className='ax-input'
              type='search'
              placeholder='Search title, tags, route'
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <div className='ax-favorites-filters' role='group' aria-label='Filter by type'>
              {TYPE_FILTERS.map((item) => {
                const active = filter === item.value
                return (
                  <button
                    key={item.value}
                    type='button'
                    className={`ax-chip ax-favorites-filter${active ? ' is-active' : ''}`}
                    aria-pressed={active}
                    onClick={() => setFilter(item.value)}
                  >
                    {item.label}
                  </button>
                )
              })}
            </div>
          </div>
        </header>

        {filtered.length === 0 ? (
          <div className='ax-card ax-favorites-empty' role='note'>
            <h3 className='ax-blade-head'>No favorites yet</h3>
            <p className='ax-muted'>
              Use the pin control inside Content to add items. They will appear here and persist after refresh.
            </p>
          </div>
        ) : (
          <div className='ax-favorites-grid'>
            {filtered.map((item) => (
              <article key={item.key} className='ax-card ax-favorite-card' data-type={item.type}>
                <header className='ax-favorite-card__head'>
                  <span className='ax-chip' data-variant='level'>
                    {typeLabel(item.type)}
                  </span>
                  <span className='ax-chip' data-variant='info'>
                    UPDATED :: {formatDate(item.updatedAt)}
                  </span>
                </header>
                <h3 className='ax-favorite-card__title'>{safeText(item.title)}</h3>
                <p className='ax-muted ax-favorite-card__route' title={item.route}>
                  {item.route}
                </p>
                {item.tags?.length ? (
                  <div className='ax-favorite-card__tags' aria-label='Tags'>
                    {item.tags.slice(0, 4).map((tag) => (
                      <span key={tag} className='ax-chip'>
                        {safeText(tag)}
                      </span>
                    ))}
                    {item.tags.length > 4 ? (
                      <span className='ax-chip ax-chip--more'>+{item.tags.length - 4}</span>
                    ) : null}
                  </div>
                ) : null}
                <div className='ax-favorite-card__actions'>
                  <button type='button' className='ax-btn ghost' onClick={() => handleOpen(item)}>
                    OPEN
                  </button>
                  <button
                    type='button'
                    className='ax-btn ghost'
                    data-variant='danger'
                    onClick={() => handleUnpin(item)}
                  >
                    UNPIN
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
