import React, { useEffect, useState } from 'react'
import DOMPurify from 'dompurify'
import type { Config as DOMPurifyConfig } from 'dompurify'
import { marked } from 'marked'

import { vfs, type ContentItem, type ContentRenderMode } from '@/lib/vfs'
import { prefixStyles, normalizeScopeId } from '@/lib/hybrid/prefixStyles'
import { deriveAssetsBase, resolveAssets } from '@/lib/hybrid/resolveAssets'

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

const MARKDOWN_SANITIZE_OPTIONS: DOMPurifyConfig = {
  ADD_TAGS: ['style', 'svg', 'path', 'defs', 'linearGradient', 'radialGradient'],
  ADD_ATTR: ['class', 'style', 'role', 'aria-label', 'id', 'fill', 'stroke', 'viewBox'],
  ALLOW_UNKNOWN_PROTOCOLS: true,
}

const STYLE_BLOCK_PATTERN = /<style[^>]*>([\s\S]*?)<\/style>/gi

type ExtractedStyles = {
  css: string
  markup: string
}

function extractStyleBlocks(html: string): ExtractedStyles {
  if (!html) {
    return { css: '', markup: '' }
  }

  if (typeof window !== 'undefined' && typeof DOMParser !== 'undefined') {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    const cssParts: string[] = []
    doc.querySelectorAll('style').forEach((node) => {
      if (node.textContent) {
        cssParts.push(node.textContent)
      }
      node.remove()
    })
    return { css: cssParts.join('\n'), markup: doc.body.innerHTML }
  }

  const cssParts: string[] = []
  const markup = html.replace(STYLE_BLOCK_PATTERN, (_, block: string) => {
    cssParts.push(block)
    return ''
  })
  return { css: cssParts.join('\n'), markup }
}

const KNOWN_RENDER_MODES: readonly ContentRenderMode[] = ['plain', 'hybrid', 'sandbox'] as const

function coerceRenderMode(value: unknown): ContentRenderMode {
  if (typeof value === 'string') {
    for (const mode of KNOWN_RENDER_MODES) {
      if (mode === value) {
        return mode
      }
    }
  }
  return 'plain'
}



export default function PreviewPane({ item, dataBase, onOpenExternal }: PreviewPaneProps) {
  const [textContent, setTextContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [renderError, setRenderError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [renderedHtml, setRenderedHtml] = useState('')

  const format = (item?.format ?? '').toLowerCase()
  const filePath = item ? ensureContentPath(item.file) : null
  const externalHref = item && filePath ? dataBase + filePath : null
  const baseRenderMode = coerceRenderMode(item?.renderMode)
  const mode = baseRenderMode


  useEffect(() => {
    let active = true
    setError(null)
    setRenderError(null)
    setRenderedHtml('')
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

  useEffect(() => {
    let cancelled = false

    setRenderError(null)

    if (!item || !isMarkdown(format) || !textContent) {
      setRenderedHtml('')
      return () => {
        cancelled = true
      }
    }

    if (mode === 'sandbox') {
      setRenderedHtml('')
      return () => {
        cancelled = true
      }
    }

    const scopeId = normalizeScopeId(item.id)
    const assetsBase = deriveAssetsBase(item)

    const run = async () => {
      try {
        const parsed = marked.parse(textContent)
        const html = typeof parsed === 'string' ? parsed : String(parsed)
        const sanitized = typeof window === 'undefined' ? html : DOMPurify.sanitize(html, MARKDOWN_SANITIZE_OPTIONS)

        if (mode === 'hybrid') {
          const { css, markup } = extractStyleBlocks(sanitized)
          const prefixedCss = css ? await prefixStyles(css, scopeId) : ''
          const resolvedMarkup = resolveAssets(markup, assetsBase, dataBase)
          const styleTag = prefixedCss ? `<style data-ax-scope="${scopeId}">${prefixedCss}</style>` : ''
          const wrapped = `<div data-ax-scope="${scopeId}">${resolvedMarkup}</div>`
          if (!cancelled) {
            setRenderedHtml(styleTag + wrapped)
          }
          return
        }

        const resolved = resolveAssets(sanitized, assetsBase, dataBase)
        if (!cancelled) {
          setRenderedHtml(resolved)
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : String(err)
          setRenderError(message)
          setRenderedHtml('')
        }
      }
    }

    run()

    return () => {
      cancelled = true
    }
  }, [dataBase, format, mode, textContent, item?.assetsBase, item?.file, item?.id])

  const shouldUseIframe = Boolean(externalHref && (isHtml(format) || mode === 'sandbox'))
  const shouldRenderMarkdown = isMarkdown(format) && mode !== 'sandbox'
  const shouldRenderText = isText(format)

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
        {error ? <div className='ax-preview__error'>Preview unavailable: {safeText(error, '-')}</div> : null}
        {renderError ? (
          <div className='ax-preview__error'>Render error: {safeText(renderError, '-')}</div>
        ) : null}

        {loading ? (
          <div className='ax-skeleton ax-skeleton--block' style={{ height: 180 }} />
        ) : null}

        {!loading && !error && !renderError ? (
          <>
            {shouldUseIframe ? (
              <iframe
                className='ax-preview__iframe'
                src={externalHref!}
                title={`content:${item.id}`}
                loading='lazy'
              />
            ) : null}

            {shouldRenderMarkdown ? (
              <div className='ax-preview__rich' dangerouslySetInnerHTML={{ __html: renderedHtml }} />
            ) : null}

            {shouldRenderText ? <pre className='ax-preview__text'>{textContent}</pre> : null}

            {!shouldUseIframe && !shouldRenderMarkdown && !shouldRenderText && externalHref ? (
              <p className='ax-preview__notice'>Preview not available for this format.</p>
            ) : null}
          </>
        ) : null}
      </section>
      {openExternalNode ? <footer className='ax-preview__actions'>{openExternalNode}</footer> : null}
    </article>
  )
}



