import React, { useEffect, useMemo, useState } from 'react'

import { useContentHub } from '@/app/routes/dashboard/content/context'
import type { ContentStatus } from '@/lib/vfs'

export interface ContentFiltersProps {
  disabled?: boolean
}

const SEARCH_DEBOUNCE_MS = 200

const ContentFilters: React.FC<ContentFiltersProps> = ({ disabled }) => {
  const { filters, availableTags, availableLanguages, features, loading } = useContentHub()
  const isDisabled = Boolean(disabled) || loading
  const [queryValue, setQueryValue] = useState(filters.query)

  useEffect(() => {
    setQueryValue(filters.query)
  }, [filters.query])

  useEffect(() => {
    const handle = window.setTimeout(() => {
      if (filters.query !== queryValue) {
        filters.setQuery(queryValue)
      }
    }, SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(handle)
  }, [filters, queryValue])

  const statusOptions = useMemo(
    () =>
      [
        { value: 'any', label: 'All' },
        { value: 'published', label: 'Published' },
        { value: 'draft', label: 'Draft' },
        { value: 'archived', label: 'Archived' },
      ] as Array<{ value: ContentStatus | 'any'; label: string }>,
    [],
  )

  const shouldRenderLanguageChips = availableLanguages.length > 0 && availableLanguages.length <= 6

  return (
    <section className='ax-content-filters' aria-live='polite'>
      <div className='ax-filter-row'>
        <label className='visually-hidden' htmlFor='content-search'>
          Search content
        </label>
        <input
          id='content-search'
          className='ax-input'
          type='search'
          placeholder='Search title, summary, tags'
          value={queryValue}
          onChange={(event) => setQueryValue(event.target.value)}
          disabled={isDisabled}
          aria-label='Search content'
        />

        <label className='visually-hidden' htmlFor='content-tag'>
          Filter by tag
        </label>
        <select
          id='content-tag'
          className='ax-input'
          value={filters.tag}
          onChange={(event) => filters.setTag(event.target.value)}
          disabled={isDisabled || availableTags.length === 0}
        >
          <option value=''>All tags</option>
          {availableTags.map((tag) => (
            <option key={tag} value={tag}>
              {tag}
            </option>
          ))}
          </select>

        <div className='ax-filter-group' role='group' aria-label='Filter by status'>
          {statusOptions.map(({ value, label }) => {
            const pressed = filters.status === value
            return (
              <button
                key={value}
                type='button'
                className='ax-chip ax-chip--toggle'
                data-active={pressed ? 'true' : undefined}
                aria-pressed={pressed}
                onClick={() => filters.setStatus(value)}
                disabled={isDisabled}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      <div className='ax-filter-row'>
        {shouldRenderLanguageChips ? (
          <div className='ax-filter-group' role='group' aria-label='Filter by language'>
            <button
              type='button'
              className='ax-chip ax-chip--toggle'
              data-active={filters.lang === 'any' ? 'true' : undefined}
              aria-pressed={filters.lang === 'any'}
              onClick={() => filters.setLang('any')}
              disabled={isDisabled}
            >
              All languages
            </button>
            {availableLanguages.map((code) => {
              const normalized = code.toUpperCase()
              const pressed = filters.lang.toLowerCase() === code.toLowerCase()
              return (
                <button
                  key={code}
                  type='button'
                  className='ax-chip ax-chip--toggle'
                  data-active={pressed ? 'true' : undefined}
                  aria-pressed={pressed}
                  onClick={() => filters.setLang(code)}
                  disabled={isDisabled}
                >
                  {normalized}
                </button>
              )
            })}
          </div>
        ) : (
          <>
            <label className='visually-hidden' htmlFor='content-lang'>
              Filter by language
            </label>
            <select
              id='content-lang'
              className='ax-input'
              value={filters.lang}
              onChange={(event) => filters.setLang(event.target.value)}
              disabled={isDisabled || availableLanguages.length === 0}
            >
              <option value='any'>All languages</option>
              {availableLanguages.map((code) => (
                <option key={code} value={code}>
                  {code.toUpperCase()}
                </option>
              ))}
            </select>
          </>
        )}

        <div className='ax-filter-actions' role='group' aria-label='Change view mode'>
          <button
            type='button'
            className='ax-btn ghost'
            data-active={filters.mode === 'browse' ? 'true' : undefined}
            onClick={() => filters.setMode('browse')}
            disabled={isDisabled}
          >
            Browse
          </button>
          <button
            type='button'
            className='ax-btn ghost'
            data-active={filters.mode === 'cards' ? 'true' : undefined}
            onClick={() => filters.setMode('cards')}
            disabled={isDisabled}
          >
            Cards
          </button>
          {features.orbitView ? (
            <button
              type='button'
              className='ax-btn ghost'
              data-active={filters.mode === 'orbit' ? 'true' : undefined}
              onClick={() => filters.setMode('orbit')}
              disabled={isDisabled}
            >
              Orbit
            </button>
          ) : null}
          <button
            type='button'
            className='ax-btn ghost'
            data-active={filters.mode === 'inspect' ? 'true' : undefined}
            onClick={() => filters.setMode('inspect')}
            disabled={isDisabled}
          >
            Inspect
          </button>
        </div>

        <button
          type='button'
          className='ax-btn ghost'
          onClick={() => filters.reset()}
          disabled={isDisabled}
        >
          Reset
        </button>
      </div>
    </section>
  )
}

export default ContentFilters
