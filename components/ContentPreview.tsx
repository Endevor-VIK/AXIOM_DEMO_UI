import React, { useEffect, useMemo, useState } from 'react'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

import { vfs, type ContentItem } from '@/lib/vfs'


function ensureContentPath(file: string): string {
  const trimmed = file.replace(/^\/+/, '')
  return trimmed.startsWith('content/') ? trimmed : 'content/' + trimmed
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

export interface ContentPreviewProps {
  item: ContentItem | null
  dataBase: string
}

const ContentPreview: React.FC<ContentPreviewProps> = ({ item, dataBase }) => {
  const [textContent, setTextContent] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const format = (item?.format || '').toLowerCase()
  const filePath = item ? ensureContentPath(item.file) : null
  const fileUrl = item && filePath ? dataBase + filePath : null

  useEffect(() => {
    let alive = true
    setTextContent('')
    setError(null)

    if (!item || !filePath) return
    if (!isMarkdown(format) && !isText(format)) return

    setLoading(true)
    vfs
      .text(filePath)
      .then((raw) => {
        if (!alive) return
        setTextContent(raw)
        setError(null)
      })
      .catch((err) => {
        if (!alive) return
        setError(err instanceof Error ? err.message : String(err))
      })
      .finally(() => {
        if (alive) setLoading(false)
      })

    return () => {
      alive = false
    }
  }, [filePath, format, item])

  const title = item?.title ?? 'Select an item'

  const markdownHtml = useMemo(() => {
    if (!isMarkdown(format) || !textContent) return ''
    const raw = marked.parse(textContent)
    const html = typeof raw === 'string' ? raw : String(raw)
    return typeof window !== 'undefined' ? DOMPurify.sanitize(html) : html
  }, [format, textContent])

  if (!item) {
    return <p className='ax-muted'>Select a content item to preview its details.</p>
  }

  return (
    <article className='ax-content-preview'>
      <header className='ax-preview-header'>
        <div>
          <h2>{title}</h2>
          <small>{item.date}</small>
        </div>
        <div className='ax-preview-meta'>
          <span className='ax-tag'>{item.category}</span>
          {item.lang && <span className='ax-tag'>{item.lang.toUpperCase()}</span>}
          {item.status && <span className='ax-tag'>{item.status}</span>}
        </div>
      </header>

      {item.summary && <p className='ax-preview-summary'>{item.summary}</p>}

      <section className='ax-preview-body' aria-live='polite'>
        {error && <div className='ax-err'>{error}</div>}
        {!error && isHtml(format) && fileUrl && (
          <iframe className='ax-frame' src={fileUrl} title={'CONTENT: ' + title} loading='lazy' />
        )}
        {!error && isMarkdown(format) && (
          <div className='ax-markdown' dangerouslySetInnerHTML={{ __html: markdownHtml }} />
        )}
        {!error && isText(format) && <pre className='ax-text-preview'>{textContent}</pre>}
        {!error && !isHtml(format) && !isMarkdown(format) && !isText(format) && fileUrl && (
          <p>
            Preview not available for <code>{format || 'unknown'}</code>.
          </p>
        )}
        {loading && <p className='ax-muted'>Loading content...</p>}
      </section>

      {fileUrl && (
        <footer className='ax-preview-footer'>
          <small>
            File path: <code className='ax-mono'>{filePath}</code>
          </small>
          <a className='ax-btn' href={fileUrl} target='_blank' rel='noopener noreferrer'>
            Open source
          </a>
        </footer>
      )}
    </article>
  )
}

export default ContentPreview
