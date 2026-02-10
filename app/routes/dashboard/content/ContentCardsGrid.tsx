import React from 'react'

import type { ContentItem } from '@/lib/vfs'
import { pickContentImage } from '@/lib/content/pickContentImage'
import { classNames, formatDate, safeText } from '@/components/utils'

export interface ContentCardsGridProps {
  items: ContentItem[]
  selectedId?: string | null
  onSelect: (item: ContentItem) => void
  onTogglePin?: (item: ContentItem) => void
  isPinned?: (item: ContentItem) => boolean
}

export default function ContentCardsGrid({
  items,
  selectedId,
  onSelect,
  onTogglePin,
  isPinned,
}: ContentCardsGridProps) {
  return (
    <div className='ax-content-cards' role='list' aria-label='Content cards'>
      {items.map((item) => {
        const isSelected = item.id === selectedId
        const pinned = isPinned?.(item) ?? false
        const title = safeText(item.title)
        return (
          <div
            key={item.id}
            role='listitem'
            className={classNames('ax-content-tile', isSelected && 'is-selected', pinned && 'is-pinned')}
            data-testid={`content-card-${item.id}`}
          >
            {onTogglePin ? (
              <button
                type='button'
                className='ax-content-tile__pin'
                aria-label={`${pinned ? 'Unpin' : 'Pin'} ${title}`}
                aria-pressed={pinned ? 'true' : 'false'}
                data-testid={`pin-toggle-${item.id}`}
                onClick={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  onTogglePin(item)
                  const option = event.currentTarget.nextElementSibling as HTMLButtonElement | null
                  option?.focus()
                }}
              >
                <span
                  aria-hidden='true'
                  className='ax-content-card__pin-icon'
                  data-state={pinned ? 'pinned' : 'unpinned'}
                >
                  <svg viewBox='0 0 16 16' focusable='false' aria-hidden='true'>
                    <path
                      d='M6.25 1.5h3.5l-.34 3.82 2.09 1.88v1.3H9.3L8.5 14.5h-1L6.7 8.5H4.5v-1.3l2.09-1.88L6.25 1.5Z'
                      fill='currentColor'
                    />
                  </svg>
                </span>
              </button>
            ) : null}

            <button
              type='button'
              className='ax-content-tile__btn'
              aria-selected={isSelected}
              data-testid={`content-select-${item.id}`}
              data-state={isSelected ? 'selected' : undefined}
              onClick={() => onSelect(item)}
            >
              <div className='ax-content-tile__media'>
                <img
                  src={pickContentImage(item)}
                  alt={title}
                  loading='lazy'
                  className='ax-content-tile__img'
                />
              </div>
              <div className='ax-content-tile__body'>
                <div className='ax-content-tile__title'>
                  <span className='ax-link-underline'>{title}</span>
                </div>
                <div className='ax-content-tile__meta'>
                  <span>{formatDate(item.date ?? (item as any).createdAt)}</span>
                  <span className='ax-content-tile__pill'>{safeText(item.category).toUpperCase()}</span>
                  <span className='ax-content-tile__pill' data-variant='status'>
                    {safeText(item.status).toUpperCase()}
                  </span>
                </div>
                {item.tags?.length ? (
                  <div className='ax-content-tile__tags' aria-label='Tags'>
                    {item.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className='ax-chip'>
                        {safeText(tag)}
                      </span>
                    ))}
                    {item.tags.length > 3 ? (
                      <span className='ax-chip ax-chip--more'>+{item.tags.length - 3}</span>
                    ) : null}
                  </div>
                ) : null}
                {item.summary ? (
                  <p className='ax-content-tile__summary' title={safeText(item.summary)} aria-label='Summary'>
                    {safeText(item.summary)}
                  </p>
                ) : null}
              </div>
            </button>
          </div>
        )
      })}
    </div>
  )
}
