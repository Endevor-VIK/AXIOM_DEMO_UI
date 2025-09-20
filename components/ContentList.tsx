import React from 'react'

import type { ContentItem } from '@/lib/vfs'
import type { ContentViewMode } from '@/app/routes/dashboard/content/context'

export interface ContentListProps {
  items: ContentItem[]
  view: ContentViewMode
  selectedId: string | null
  onSelect(id: string): void
  pinned: string[]
  onTogglePin(id: string): void
}

const ContentList: React.FC<ContentListProps> = ({
  items,
  view,
  selectedId,
  onSelect,
  pinned,
  onTogglePin,
}) => {
  if (!items.length) {
    return <p className='ax-muted'>No content matches the current filters.</p>
  }

  const renderCard = (item: ContentItem) => {
    const isActive = selectedId === item.id
    const isPinned = pinned.includes(item.id)
    return (
      <article
        key={item.id}
        className={`ax-card ax-content-card ${isActive ? 'active' : ''}`.trim()}
        aria-current={isActive ? 'true' : undefined}
      >
        <header className='ax-card-header'>
          <div>
            <h3>{item.title}</h3>
            <small>{item.date}</small>
          </div>
          <button
            type='button'
            className={`ax-pin ${isPinned ? 'pinned' : ''}`.trim()}
            aria-pressed={isPinned}
            aria-label={isPinned ? 'Unpin item' : 'Pin item'}
            onClick={() => onTogglePin(item.id)}
          >
            {isPinned ? '★' : '☆'}
          </button>
        </header>
        <p className='ax-card-summary'>{item.summary || 'No summary'}</p>
        <footer className='ax-card-footer'>
          <button
            type='button'
            className='ax-btn primary'
            onClick={() => onSelect(item.id)}
          >
            Open
          </button>
        </footer>
      </article>
    )
  }

  const renderListRow = (item: ContentItem) => {
    const isActive = selectedId === item.id
    const isPinned = pinned.includes(item.id)
    return (
      <li key={item.id} className={`ax-row ${isActive ? 'active' : ''}`.trim()}>
        <button
          type='button'
          className='ax-pin'
          aria-pressed={isPinned}
          aria-label={isPinned ? 'Unpin item' : 'Pin item'}
          onClick={() => onTogglePin(item.id)}
        >
          {isPinned ? '★' : '☆'}
        </button>
        <button
          type='button'
          className='ax-row-button'
          onClick={() => onSelect(item.id)}
          aria-current={isActive ? 'true' : undefined}
        >
          <span className='ax-row-title'>{item.title}</span>
          <span className='ax-row-meta'>{item.date}</span>
          <span className='ax-row-tags'>
            {(item.tags ?? []).slice(0, 3).map((tag) => (
              <span key={tag} className='ax-tag'>
                {tag}
              </span>
            ))}
          </span>
        </button>
      </li>
    )
  }

  if (view === 'cards') {
    return <div className='ax-content-grid'>{items.map(renderCard)}</div>
  }

  return <ul className='ax-content-list'>{items.map(renderListRow)}</ul>
}

export default ContentList
