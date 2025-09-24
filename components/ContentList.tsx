import React from 'react'

import type { ContentItem } from '@/lib/vfs'

import { classNames, formatDate, safeText } from './utils'

export interface ContentListProps {
  items: ContentItem[]
  selectedId?: string | null
  onSelect: (item: ContentItem) => void
}

const PLACEHOLDER_ITEMS = 3

export default function ContentList({ items, selectedId, onSelect }: ContentListProps) {
  const hasItems = items.length > 0

  return (
    <div className='ax-content-list' role='listbox' aria-label='Content items'>
      {hasItems
        ? items.map((item) => {
            const isSelected = item.id === selectedId
            return (
              <article key={item.id} className={classNames('ax-content-card', isSelected && 'is-selected')}>
                <button
                  type='button'
                  role='option'
                  aria-selected={isSelected}
                  className='ax-content-card__btn'
                  onClick={() => onSelect(item)}
                >
                  <div className='ax-content-card__title'>{safeText(item.title)}</div>
                  <div className='ax-content-card__meta'>
                    <span className='ax-content-card__date'>{formatDate(item.date)}</span>
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
                </button>
              </article>
            )
          })
        : Array.from({ length: PLACEHOLDER_ITEMS }).map((_, index) => (
            <article key={index} className='ax-content-card'>
              <div className='ax-content-card__btn' aria-hidden='true'>
                <div className='ax-skeleton ax-skeleton--text' style={{ width: '60%' }} />
                <div className='ax-skeleton ax-skeleton--text' style={{ width: '35%', marginTop: 8 }} />
                <div className='ax-skeleton ax-skeleton--block' style={{ height: 48, marginTop: 12 }} />
              </div>
            </article>
          ))}
    </div>
  )
}
