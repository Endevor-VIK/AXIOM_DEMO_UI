import React, { useEffect, useMemo, useState } from 'react'
import DOMPurify from 'dompurify'
import { marked } from 'marked'

import { vfs, type ContentItem } from '@/lib/vfs'

import { classNames, formatDate, safeText } from './utils'

type PreviewPaneProps = {
  item: ContentItem | null
  dataBase: string
  onOpenExternal?: (href: string) => void
}

function ensureContentPath(file: string): string {
  const trimmed = file.replace(/^\/+/, '')
  return trimmed.startsWith('content/') ? trimmed : `content/${trimmed}`
}

function isHtml(format: string): boolean {
  return format === 'html'
}

function isMarkdown(format: string): boolean {
  return format === 'md' || format === 'markdown'
}

function isText(format: string): boolean {
  return format === 'txt'
}

export default function PreviewPane({ item, dataBase, onOpenExternal }: PreviewPaneProps) {
  const [textContent, setTextContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const format = (item?.format ?? '').toLowerCase()
  const filePath = item ? ensureContentPath(item.file) : null
  const externalHref = item && filePath ? dataBase + filePath : null

  useEffect(() => {
    let active = true
    setError(null)
    setTextContent('')
    setLoading(false)

    if (!item || !filePath) return
    if (!isMarkdown(format) && !isText(format)) return

    setLoading(true)

    vfs
      .text(filePath)
      .then((raw) => {
        if (!active) return
        setTextContent(raw)
      })
      .catch((err) => {
        if (!active) return
        setError(err instanceof Error ? err.message : String(err))
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [item, filePath, format])

  const markdownHtml = useMemo(() => {
    if (!isMarkdown(format) || !textContent) return ''
    const raw = marked.parse(textContent)
    const html = typeof raw === 'string' ? raw : String(raw)
    return typeof window !== 'undefined' ? DOMPurify.sanitize(html) : html
  }, [format, textContent])

  const openExternalNode = externalHref
    ? onOpenExternal
      ? (
          <button
            type='button'
            className='ax-btn ax-btn--primary'
            onClick={() => onOpenExternal(externalHref)}
          >
            Open source
          </button>
        )
      : (
          <a className='ax-btn ax-btn--primary' href={externalHref} target='_blank' rel='noopener noreferrer'>
            Open source
          </a>
        )
    : null

  if (!item) {
    return (
      <article className={classNames('ax-preview', 'is-empty')} aria-live='polite'>
        <div className='ax-preview__placeholder'>
          <div className='ax-skeleton ax-skeleton--text' style={{ width: '70%', height: 22 }} />
          <div className='ax-skeleton ax-skeleton--text' style={{ width: '40%', height: 16, marginTop: 8 }} />
          <div className='ax-skeleton ax-skeleton--block' style={{ height: 120, marginTop: 20 }} />
        </div>
        <p className='ax-muted'>Select a content item to preview its details.</p>
      </article>
    )
  }

  return (
    <article className='ax-preview' aria-live='polite'>
      <header className='ax-preview__header'>
        <div className='ax-preview__heading'>
          <h3 className='ax-preview__title'>{safeText(item.title)}</h3>
          <span className='ax-preview__date'>{formatDate(item.date)}</span>
        </div>
        <div className='ax-preview__chips'>
          <span className='ax-chip'>{safeText(item.category)}</span>
          {item.lang ? <span className='ax-chip'>{safeText(item.lang.toUpperCase())}</span> : null}
          {item.status ? <span className='ax-chip'>{safeText(item.status)}</span> : null}
        </div>
      </header>

      {item.summary ? <p className='ax-preview__summary'>{safeText(item.summary)}</p> : null}

      {item.tags?.length ? (
        <div className='ax-preview__tags' aria-label='Tags'>
          {item.tags.map((tag) => (
            <span key={tag} className='ax-chip'>
              {safeText(tag)}
            </span>
          ))}
        </div>
      ) : null}

      <section className='ax-preview__body'>
        {error ? <div className='ax-preview__error'>Preview unavailable: {safeText(error, '—')}</div> : null}

        {loading ? (
          <div className='ax-skeleton ax-skeleton--block' style={{ height: 180 }} />
        ) : null}

        {!loading && !error ? (
          <>
            {isHtml(format) && externalHref ? (
              <iframe
                className='ax-preview__iframe'
                src={externalHref}
                title={`content:${item.id}`}
                loading='lazy'
              />
            ) : null}

            {isMarkdown(format) ? (
              <div
                className='ax-preview__rich'
                dangerouslySetInnerHTML={{ __html: markdownHtml }}
              />
            ) : null}

            {isText(format) ? <pre className='ax-preview__text'>{textContent}</pre> : null}

            {!isHtml(format) && !isMarkdown(format) && !isText(format) && externalHref ? (
              <p className='ax-preview__notice'>Preview not available for this format.</p>
            ) : null}
          </>
        ) : null}
      </section>

      {openExternalNode ? <footer className='ax-preview__actions'>{openExternalNode}</footer> : null}
    </article>
  )
}
