import React from 'react'

import type { ContentItem } from '@/lib/vfs'

import { classNames, formatDate, safeText } from './utils'

export interface ContentListProps {
  items: ContentItem[]
  selectedId?: string | null
  onSelect: (item: ContentItem) => void
  renderExpanded?: (item: ContentItem) => React.ReactNode
  onTogglePin?: (item: ContentItem) => void
  isPinned?: (item: ContentItem) => boolean
}

const PLACEHOLDER_ITEMS = 3

export default function ContentList({
  items,
  selectedId,
  onSelect,
  renderExpanded,
  onTogglePin,
  isPinned,
}: ContentListProps) {
  const hasItems = items.length > 0

  return (
    <div className='ax-content-list' role='listbox' aria-label='Content items'>
      {hasItems
        ? items.map((item) => {
            const isSelected = item.id === selectedId
            const pinned = isPinned?.(item) ?? false
            return (
              <div
                key={item.id}
                data-testid={`content-card-${item.id}`}
                role='option'
                tabIndex={0}
                aria-selected={isSelected}
                className={classNames('ax-content-card', isSelected && 'is-selected', pinned && 'is-pinned')}
                onClick={() => onSelect(item)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    onSelect(item)
                  }
                }}
              >
                {onTogglePin ? (
                  <button
                    type='button'
                    className='ax-content-card__pin'
                    aria-label={`${pinned ? 'Unpin' : 'Pin'} ${safeText(item.title)}`}
                    aria-pressed={pinned ? 'true' : 'false'}
                    data-testid={`pin-toggle-${item.id}`}
                    onClick={(event) => {
                      event.stopPropagation()
                      onTogglePin(item)
                      ;(event.currentTarget.parentElement as HTMLElement | null)?.focus()
                    }}
                  >
                    <span aria-hidden='true' className='ax-content-card__pin-icon' data-state={pinned ? 'pinned' : 'unpinned'}>
                      {pinned ? 'PINNED' : 'PIN'}
                    </span>
                  </button>
                ) : null}
                <div className='ax-content-card__btn'>
                  <div className='ax-content-card__title'>
                    <span className='ax-link-underline'>{safeText(item.title)}</span>
                  </div>
                  <div className='ax-content-card__meta'>
                    <span className='ax-content-card__date'>{formatDate(item.date ?? item.createdAt)}</span>
                    {item.tags?.length ? (
                      <span className='ax-content-card__tags'>
                        {item.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className='ax-chip'>
                            {safeText(tag)}
                          </span>
                        ))}
                        {item.tags.length > 3 ? <span className='ax-chip ax-chip--more'>+{item.tags.length - 3}</span> : null}
                      </span>
                    ) : null}
                  </div>
                  <p className='ax-content-card__summary'>{safeText(item.summary)}</p>
                </div>
                {isSelected && renderExpanded ? renderExpanded(item) : null}
              </div>
            )
          })
        : Array.from({ length: PLACEHOLDER_ITEMS }).map((_, index) => (
            <div key={index} className='ax-content-card' role='presentation'>
              <div className='ax-content-card__btn' aria-hidden='true'>
                <div className='ax-skeleton ax-skeleton--text' style={{ width: '60%' }} />
                <div className='ax-skeleton ax-skeleton--text' style={{ width: '35%', marginTop: 8 }} />
                <div className='ax-skeleton ax-skeleton--block' style={{ height: 48, marginTop: 12 }} />
              </div>
            </div>
          ))}
    </div>
  )
}
