import React from 'react'

import { useContentHub } from '@/app/routes/dashboard/content/context'

export interface ContentFiltersProps {
  disabled?: boolean
}

const ContentFilters: React.FC<ContentFiltersProps> = ({ disabled }) => {
  const { filters, availableTags, availableLanguages, loading } = useContentHub()
  const isDisabled = Boolean(disabled) || loading

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
          placeholder='Search by title, summary, tags'
          value={filters.query}
          onChange={(event) => filters.setQuery(event.target.value)}
          disabled={isDisabled}
        />

        <label className='visually-hidden' htmlFor='content-tag'>Filter by tag</label>
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

        <label className='visually-hidden' htmlFor='content-status'>Filter by status</label>
        <select
          id='content-status'
          className='ax-input'
          value={filters.status}
          onChange={(event) => filters.setStatus(event.target.value as typeof filters.status)}
          disabled={isDisabled}
        >
          <option value='any'>All statuses</option>
          <option value='published'>Published</option>
          <option value='draft'>Draft</option>
          <option value='archived'>Archived</option>
        </select>

        <label className='visually-hidden' htmlFor='content-lang'>Filter by language</label>
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

        <div className='ax-view-toggle' role='group' aria-label='Change layout'>
          <button
            type='button'
            className={`ax-btn ${filters.view === 'cards' ? 'primary' : ''}`.trim()}
            onClick={() => filters.setView('cards')}
            disabled={isDisabled}
          >
            Cards
          </button>
          <button
            type='button'
            className={`ax-btn ${filters.view === 'list' ? 'primary' : ''}`.trim()}
            onClick={() => filters.setView('list')}
            disabled={isDisabled}
          >
            List
          </button>
        </div>

        <button
          type='button'
          className='ax-btn subtle'
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
