// AXIOM_DEMO_UI � WEB CORE
// Canvas: C20 � components/NewsCard.tsx
// Purpose: Red Protocol news card with kind/date/tags and external link.

import React from 'react'
import type { NewsItem } from '@/lib/vfs'

const KIND_VARIANT: Record<string, 'info' | 'good' | 'warn'> = {
  release: 'good',
  update: 'info',
  'heads-up': 'warn',
}

function variantFor(kind?: string): 'info' | 'good' | 'warn' {
  if (!kind) return 'info'
  const key = kind.toLowerCase()
  return KIND_VARIANT[key] || 'info'
}

export default function NewsCard({ item }: { item: NewsItem }) {
  const variant = variantFor(item.kind)
  const kindLabel = (item.kind || 'news').toUpperCase()
  const isMinor = !item.link
  const kindKey = (item.kind || 'news').toLowerCase()

  return (
    <article
      className='ax-card ax-news-card'
      data-kind={kindKey}
      data-state={isMinor ? 'minor' : 'normal'}
      aria-labelledby={`news-${item.id}`}
    >
      <header className='ax-news-card__head'>
        <div className='ax-news-card__title-wrap'>
          <span className='ax-news-card__eyebrow'>DATA SLATE</span>
          <h3 id={`news-${item.id}`} className='ax-news-card__title'>
            {item.title}
          </h3>
        </div>
        <span className='ax-news-card__date'>{item.date}</span>
      </header>

      <div className='ax-news-card__meta'>
        <span className='ax-chip' data-variant={variant}>{kindLabel}</span>
        {item.tags?.length ? (
          <div className='ax-news-card__tags' aria-label='tags'>
            {item.tags.map((tag) => (
              <span key={tag} className='ax-chip' data-variant='info'>
                {tag.toUpperCase()}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {item.summary && <p className='ax-news-card__summary'>{item.summary}</p>}

      <div className='ax-news-card__actions'>
        {item.link ? (
          <a className='ax-btn ghost' href={item.link} target='_blank' rel='noopener noreferrer'>
            OPEN
          </a>
        ) : (
          <span className='ax-chip' data-variant='warn'>COMING SOON</span>
        )}
      </div>
    </article>
  )
}
