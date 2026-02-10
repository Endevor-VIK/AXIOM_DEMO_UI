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

type NewsCardProps = {
  item: NewsItem
  searchTerm?: string
  resolvedLink?: string | null
}

function highlightText(text: string, term?: string) {
  if (!term) return text
  const trimmed = term.trim()
  if (trimmed.length < 2) return text
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${escaped})`, 'ig')
  const parts = text.split(regex)
  return parts.map((part, index) =>
    index % 2 === 1 ? (
      <mark key={`${part}-${index}`} className='ax-news-mark'>
        {part}
      </mark>
    ) : (
      <span key={`${part}-${index}`}>{part}</span>
    )
  )
}

export default function NewsCard({ item, searchTerm, resolvedLink }: NewsCardProps) {
  const variant = variantFor(item.kind)
  const kindLabel = (item.kind || 'news').toUpperCase()
  const isMinor = !item.link
  const kindKey = (item.kind || 'news').toLowerCase()
  const tags = item.tags ?? []
  const maxTags = 3
  const shownTags = tags.slice(0, maxTags)
  const extraTags = Math.max(0, tags.length - shownTags.length)
  const link = resolvedLink ?? item.link ?? ''
  const hasLink = Boolean(link)

  const handleOpen = () => {
    if (!hasLink) return
    window.open(link, '_blank', 'noopener,noreferrer')
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
      data-clickable={hasLink ? 'true' : 'false'}
      aria-labelledby={`news-${item.id}`}
      role={hasLink ? 'link' : undefined}
      tabIndex={hasLink ? 0 : undefined}
      onClick={hasLink ? handleOpen : undefined}
      onKeyDown={hasLink ? handleKeyDown : undefined}
    >
      <header className='ax-news-card__top'>
        <span className='ax-chip ax-news-card__kind' data-variant={variant}>{kindLabel}</span>
        <span className='ax-news-card__date'>{item.date}</span>
      </header>

      <h3 id={`news-${item.id}`} className='ax-news-card__title'>
        {item.title}
      </h3>

      {item.summary && <p className='ax-news-card__summary'>{highlightText(item.summary, searchTerm)}</p>}

      <footer className='ax-news-card__footer'>
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
        ) : (
          <span className='ax-news-card__tags-empty'>NO TAGS</span>
        )}

        {hasLink ? (
          <a
            className='ax-news-card__action'
            href={link}
            target='_blank'
            rel='noopener noreferrer'
            onClick={(event) => event.stopPropagation()}
          >
            OPEN <span aria-hidden='true'>→</span>
          </a>
        ) : !item.link ? (
          <span className='ax-news-card__coming'>COMING SOON</span>
        ) : null}
      </footer>
    </article>
  )
}
