import React, { useMemo, useState } from 'react'

import type { ContentPreviewData } from '../types'

export interface ContentSidebarProps {
  entries: ContentPreviewData[]
  selectedId: string | null
  onSelect(id: string): void
}

function matchesQuery(entry: ContentPreviewData, rawQuery: string): boolean {
  const query = rawQuery.trim().toLowerCase()
  if (!query) return true
  const haystack = [
    entry.id,
    entry.title,
    entry.zone,
    entry.tags.join(' '),
  ]
    .join(' ')
    .toLowerCase()
  return haystack.includes(query)
}

const ContentSidebar: React.FC<ContentSidebarProps> = ({ entries, selectedId, onSelect }) => {
  const [query, setQuery] = useState('')

  const filtered = useMemo(
    () => entries.filter((item) => matchesQuery(item, query)),
    [entries, query]
  )

  const total = entries.length
  const activeId = selectedId ?? (filtered[0]?.id ?? null)

  return (
    <aside className='axch-sidebar' aria-label='Content list and search'>
      <div>
        <p className='axch-sidebar__eyebrow'>CONTENT HUB v2</p>
        <h3 className='axch-sidebar__title'>Files</h3>
      </div>

      <div className='axch-sidebar__search'>
        <input
          type='search'
          placeholder='Поиск по id, title, tags'
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label='Поиск по контенту'
        />
      </div>

      <div className='axch-sidebar__meta'>
        {filtered.length} из {total} файлов · нажмите, чтобы открыть превью
      </div>

      <ul className='axch-sidebar__list'>
        {filtered.map((entry) => {
          const isActive = entry.id === activeId
          const tagsPreview = entry.tags.slice(0, 3).join(' · ')
          return (
            <li
              key={entry.id}
              className={`axch-sidebar__item${isActive ? ' is-active' : ''}`}
            >
              <button type='button' onClick={() => onSelect(entry.id)}>
                <span className='axch-sidebar__id'>[{entry.id}]</span>
                <span className='axch-sidebar__name'>{entry.title}</span>
                <span className='axch-sidebar__tags'>{tagsPreview}</span>
                <span className='axch-sidebar__status'>
                  {entry.status.toUpperCase()} · {entry.lang.toUpperCase()}
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      {filtered.length === 0 ? (
        <div className='axch-sidebar__empty'>Нет совпадений по запросу.</div>
      ) : null}
    </aside>
  )
}

export default ContentSidebar
