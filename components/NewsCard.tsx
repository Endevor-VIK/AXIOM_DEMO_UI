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
  const tags = item.tags ?? []
  const maxTags = 3
  const shownTags = tags.slice(0, maxTags)
  const extraTags = Math.max(0, tags.length - shownTags.length)

  const handleOpen = () => {
    if (!item.link) return
    window.open(item.link, '_blank', 'noopener,noreferrer')
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (!item.link) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleOpen()
    }
  }

  return (
    <article
      className='ax-card ax-news-card'
      data-kind={kindKey}
      data-state={isMinor ? 'minor' : 'normal'}
      data-clickable={item.link ? 'true' : 'false'}
      aria-labelledby={`news-${item.id}`}
      role={item.link ? 'link' : undefined}
      tabIndex={item.link ? 0 : undefined}
      onClick={item.link ? handleOpen : undefined}
      onKeyDown={item.link ? handleKeyDown : undefined}
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
        {tags.length ? (
          <div className='ax-news-card__tags' aria-label='tags'>
            {shownTags.map((tag) => (
              <span key={tag} className='ax-chip' data-variant='info'>
                {tag.toUpperCase()}
              </span>
            ))}
            {extraTags > 0 ? (
              <span className='ax-chip' data-variant='info'>+{extraTags}</span>
            ) : null}
          </div>
        ) : null}
      </div>

      {item.summary && <p className='ax-news-card__summary'>{item.summary}</p>}

      <div className='ax-news-card__actions'>
        {item.link ? (
          <a
            className='ax-btn ghost'
            href={item.link}
            target='_blank'
            rel='noopener noreferrer'
            onClick={(event) => event.stopPropagation()}
          >
            OPEN
          </a>
        ) : (
          <span className='ax-news-card__coming'>COMING SOON</span>
        )}
      </div>
    </article>
  )
}
