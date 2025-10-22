import React from 'react'

import type { ContentItem } from '@/lib/vfs'

import { classNames, formatDate, safeText } from './utils'

export interface ContentListProps {
  items: ContentItem[]
  selectedId?: string | null
  onSelect: (item: ContentItem) => void
  onTogglePin?: (item: ContentItem) => void
  isPinned?: (item: ContentItem) => boolean
}

const PLACEHOLDER_ITEMS = 3

function getAuthorInitials(name: string | undefined): string {
  if (!name) return ''
  const parts = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
  if (!parts.length) return ''
  if (parts.length === 1) return parts[0]!.charAt(0).toUpperCase()
  const first = parts[0]!.charAt(0)
  const last = parts[parts.length - 1]!.charAt(0)
  return `${first}${last}`.toUpperCase()
}

export default function ContentList({
  items,
  selectedId,
  onSelect,
  onTogglePin,
  isPinned,
}: ContentListProps) {
  const hasItems = items.length > 0

  return (
    <div className='ax-content-list' role='list' aria-label='Content items'>
      {hasItems
        ? items.map((item) => {
            const isSelected = item.id === selectedId
            const pinned = isPinned?.(item) ?? false
            const authorName = item.author ? safeText(item.author) : null
            const authorInitials = getAuthorInitials(item.author)
            return (
              <div
                key={item.id}
                data-testid={`content-card-${item.id}`}
                role='listitem'
                className={classNames('ax-content-card', isSelected && 'is-selected', pinned && 'is-pinned')}
              >
                {onTogglePin ? (
                  <button
                    type='button'
                    className='ax-content-card__pin'
                    aria-label={`${pinned ? 'Unpin' : 'Pin'} ${safeText(item.title)}`}
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
                  aria-selected={isSelected}
                  className='ax-content-card__btn'
                  data-state={isSelected ? 'selected' : undefined}
                  data-testid={`content-select-${item.id}`}
                  onClick={() => onSelect(item)}
                >
                  <div className='ax-content-card__title'>
                    <span className='ax-link-underline'>{safeText(item.title)}</span>
                  </div>
                  <div className='ax-content-card__meta'>
                    <span className='ax-content-card__date'>{formatDate(item.date ?? item.createdAt)}</span>
                    {authorName ? (
                      <span className='ax-content-card__author'>
                        <span className='ax-avatar' aria-hidden='true'>
                          {authorInitials || 'AX'}
                        </span>
                        <span className='ax-content-card__author-name'>{authorName}</span>
                      </span>
                    ) : null}
                  </div>
                  {item.tags?.length ? (
                    <div className='ax-content-card__tags' aria-label='Tags'>
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
                    <p
                      className='ax-content-card__summary'
                      title={safeText(item.summary)}
                      aria-label='Summary'
                    >
                      {safeText(item.summary)}
                    </p>
                  ) : null}
                </button>
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
